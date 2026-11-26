#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
结婚率.xlsx -> data/marriage_*.csv

扫表判块：不写死行号，靠「年份 / 地区 / 季度」等表头词定位每个数据块，
再根据表头列名 + 首行单元格类型判断是季度块还是年度块。

用法：
    python scripts/marriage_xlsx2csv.py
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "marriage_rates.xlsx"
DATA_DIR = ROOT / "data"

# 地雷 1：省表标题写「2025」，但汇总 610.55 / 351.30 与 2024 全国数一致，
# 因此省份表的 year 一律写 2024。
PROVINCE_YEAR = 2024
EXPECTED_PROVINCE_MARRIAGES = 610.55  # 用于自检
EXPECTED_PROVINCE_DIVORCES = 351.30


def norm(value) -> str:
    """把单元格值规整成去空白字符串，None -> ''。"""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def is_header(row, keyword: str) -> bool:
    return any(norm(cell) == keyword for cell in row)


def num(value):
    """取数值；空值返回 None。"""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def fmt(value) -> str:
    """CSV 单元格：空值写空字符串，数字去掉多余小数零。"""
    if value is None:
        return ""
    if isinstance(value, float):
        value = round(value, 6)
        if value.is_integer():
            return str(int(value))
        return f"{value:.6f}".rstrip("0").rstrip(".")
    return str(value)


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(header)
        for row in rows:
            writer.writerow([fmt(v) for v in row])
    print(f"  -> {path.relative_to(ROOT)} ({len(rows)} rows)")


# --------------------------------------------------------------------------
# Sheet1：上半季度块 + 下半年度块
# --------------------------------------------------------------------------
def parse_sheet1(ws):
    rows = [[c for c in row] for row in ws.iter_rows(values_only=True)]
    quarterly: list[list] = []
    annual: list[list] = []

    i = 0
    while i < len(rows):
        row = rows[i]
        if not is_header(row, "年份"):
            i += 1
            continue

        headers = [norm(c) for c in row]
        block: list[tuple] = []
        j = i + 1
        while j < len(rows) and rows[j][0] is not None:
            block.append(rows[j])
            j += 1

        first = block[0][0] if block else None
        is_quarter_block = isinstance(first, (dt.datetime, dt.date))

        if is_quarter_block:
            # 季度块：col0 是季度起始日，col1 是结婚登记（万对）
            for data_row in block:
                day = data_row[0]
                if not isinstance(day, (dt.datetime, dt.date)):
                    continue
                if day.month not in (1, 4, 7, 10):
                    raise ValueError(f"季度块出现非季初月份：{day}")
                quarter = (day.month - 1) // 3 + 1
                marriages = num(data_row[1])
                if marriages is None:  # 2026Q4 只有日期没有数
                    continue
                quarterly.append([day.year, quarter, marriages])
            print(f"  季度块：{len(block)} 行（表头第 {i + 1} 行），有效 {len(quarterly)} 条")
        elif isinstance(first, (int, float)) and not isinstance(first, bool):
            # 年度块：年份 / 结婚 / 离婚 / 离结比
            for data_row in block:
                year = num(data_row[0])
                if year is None:
                    continue
                marriages = num(data_row[1])
                divorces = num(data_row[2])
                sheet_ratio = num(data_row[3]) if len(data_row) > 3 else None
                if marriages is None:
                    continue
                ratio = None
                if divorces is not None and marriages:
                    ratio = divorces / marriages  # 地雷 2：只用对数 ÷ 对数
                    if sheet_ratio is not None and abs(sheet_ratio - ratio) > 0.002:
                        print(f"  ! {int(year)} 年离结比与表内值不一致：{ratio:.4f} vs {sheet_ratio:.4f}")
                annual.append([int(year), marriages, divorces, ratio])
            print(f"  年度块：{len(block)} 行（表头第 {i + 1} 行），有效 {len(annual)} 条")
        else:
            print(f"  ! 跳过无法识别的「年份」块（表头第 {i + 1} 行）")

        i = j

    return quarterly, annual


# --------------------------------------------------------------------------
# Sheet2：两半叠在一个 sheet
#   上半：结婚登记(万对) / 初婚(万人) / 再婚(万人) / 离婚(万对) / 离婚率 / 结婚(万人) / 离结比 / 初婚离结比
#   下半：结婚登记(万对) / 初婚(万对) / 再婚(万对) / 离婚(万对) / 离婚率 / 离结比
# 两半地区顺序一致；初婚/再婚取「人数」那一半（地雷 3）。
# --------------------------------------------------------------------------
def parse_sheet2(ws):
    rows = [[c for c in row] for row in ws.iter_rows(values_only=True)]
    person_blocks: list[dict] = []
    couple_blocks: list[dict] = []

    i = 0
    while i < len(rows):
        row = rows[i]
        if norm(row[0]) != "地区":
            i += 1
            continue

        headers = [norm(c) for c in row]
        col = {name: idx for idx, name in enumerate(headers) if name}

        records = []
        total_row = None
        j = i + 1
        while j < len(rows):
            label = norm(rows[j][0])
            if label == "":
                break
            if label in ("汇总", "合计", "全国"):
                total_row = rows[j]
                j += 1
                continue
            records.append(rows[j])
            j += 1

        # 人数块的特征列：初婚 > 结婚登记，且带「初婚离结比」
        is_person_block = "初婚离结比" in col
        kind = "人数" if is_person_block else "对数"

        parsed = {
            "kind": kind,
            "header_row": i + 1,
            "col": col,
            "rows": [],
            "total": None,
        }
        for data_row in records:
            province = norm(data_row[0])
            marriages = num(data_row[col["结婚登记"]])
            first = num(data_row[col["初婚"]])
            remarriage = num(data_row[col["再婚"]])
            divorces = num(data_row[col["离婚"]])
            rate = num(data_row[col["离婚率"]])
            parsed["rows"].append(
                {
                    "province": province,
                    "marriages": marriages,
                    "first": first,
                    "remarriage": remarriage,
                    "divorces": divorces,
                    "rate": rate,
                }
            )
        if total_row is not None:
            parsed["total"] = {
                "marriages": num(total_row[col["结婚登记"]]),
                "first": num(total_row[col["初婚"]]),
                "remarriage": num(total_row[col["再婚"]]),
                "divorces": num(total_row[col["离婚"]]),
                "rate": num(total_row[col["离婚率"]]),
            }

        if is_person_block:
            person_blocks.append(parsed)
        else:
            couple_blocks.append(parsed)
        print(f"  省份{kind}块：表头第 {i + 1} 行，{len(parsed['rows'])} 个地区")
        i = j

    if not person_blocks and not couple_blocks:
        raise ValueError("Sheet2 没找到省份数据块")

    person_map = {r["province"]: r for b in person_blocks for r in b["rows"]}
    couple_map = {r["province"]: r for b in couple_blocks for r in b["rows"]}
    # 以人数块顺序为准（通常就是原表顺序）
    order = list(person_map) or list(couple_map)

    missing_person = [p for p in order if p not in person_map]
    if missing_person:
        raise ValueError(f"以下省份缺少人数块（初婚/再婚人数）：{missing_person}")

    provinces = []
    for name in order:
        p = person_map[name]
        c = couple_map.get(name, {})
        first = p["first"]
        remarriage = p["remarriage"]
        if first is None and c.get("first") is not None:
            first = c["first"] * 2  # 万对 -> 万人
        if remarriage is None and c.get("remarriage") is not None:
            remarriage = c["remarriage"] * 2
        divorces = p["divorces"] if p["divorces"] is not None else c.get("divorces")
        marriages = p["marriages"] if p["marriages"] is not None else c.get("marriages")
        # 地雷 2：离结比只按 离婚对数 ÷ 结婚登记对数 重算
        ratio = divorces / marriages if divorces is not None and marriages else None
        if ratio is not None and c.get("divorces") is not None and c.get("marriages"):
            couple_ratio = c["divorces"] / c["marriages"]
            if abs(couple_ratio - ratio) > 0.002:
                print(f"  ! {name} 离结比两半不一致：{ratio:.4f} vs {couple_ratio:.4f}")
        provinces.append([PROVINCE_YEAR, name, marriages, first, remarriage, divorces, p["rate"], ratio])

    total_marriages = sum(r[2] for r in provinces if r[2] is not None)
    total_divorces = sum(r[5] for r in provinces if r[5] is not None)
    print(
        f"  省份合计：结婚 {total_marriages:.2f} 万对、离婚 {total_divorces:.2f} 万对"
        f"（应约 {EXPECTED_PROVINCE_MARRIAGES} / {EXPECTED_PROVINCE_DIVORCES}）"
    )
    if abs(total_marriages - EXPECTED_PROVINCE_MARRIAGES) > 0.1:
        raise ValueError("省份合计与 2024 全国结婚数不符，省表年份/口径可能变了")

    return provinces


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"找不到源文件：{SRC}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)

    print(f"读取 {SRC.relative_to(ROOT)}，sheets={wb.sheetnames}")
    ws1 = wb[wb.sheetnames[0]]
    quarterly, annual = parse_sheet1(ws1)
    quarterly.sort(key=lambda r: (r[0], r[1]))
    annual.sort(key=lambda r: r[0])

    write_csv(DATA_DIR / "marriage_quarterly.csv", ["year", "quarter", "marriages_wan"], quarterly)
    write_csv(
        DATA_DIR / "marriage_annual.csv",
        ["year", "marriages_wan", "divorces_wan", "divorce_marriage_ratio"],
        annual,
    )

    provinces = []
    if len(wb.sheetnames) > 1:
        provinces = parse_sheet2(wb[wb.sheetnames[1]])
    write_csv(
        DATA_DIR / "marriage_provinces.csv",
        [
            "year",
            "province",
            "marriages_wan",
            "first_marriage_wan",
            "remarriage_wan",
            "divorces_wan",
            "divorce_rate_permille",
            "divorce_marriage_ratio",
        ],
        provinces,
    )

    meta = {
        "title": "中国结婚与离婚登记数据",
        "source": "国家民政部婚姻登记统计（用户提供 Excel：结婚率.xlsx）",
        "source_file": "data/source/marriage_rates.xlsx",
        "generated_by": "scripts/marriage_xlsx2csv.py",
        "generated_at": dt.datetime.now().strftime("%Y-%m-%d"),
        "cutoff": {
            "quarterly": "2026-09-30",
            "annual": "2025-12-31",
            "provinces": "2024-12-31",
        },
        "units": {
            "marriages_wan": "万对",
            "divorces_wan": "万对",
            "first_marriage_wan": "万人（人数，不是对数）",
            "remarriage_wan": "万人（人数，不是对数）",
            "divorce_rate_permille": "‰",
            "divorce_marriage_ratio": "比值（离婚对数 ÷ 结婚登记对数）",
        },
        "definitions": {
            "marriages_wan": "结婚登记对数，单位万对",
            "divorces_wan": "离婚登记对数，单位万对；2010 年起有分年数据",
            "divorce_marriage_ratio": "离婚登记对数 ÷ 结婚登记对数，不是除以人数",
            "first_marriage_wan": "初婚人数（万人）。初婚占比 = 初婚人数 ÷ (2 × 结婚登记对数)",
            "remarriage_wan": "再婚人数（万人）。再婚占比 = 再婚人数 ÷ (2 × 结婚登记对数)",
            "divorce_rate_permille": "离婚率，千分号",
        },
        "notes": [
            "省表标题写「2025 年」，但 31 省汇总结婚 610.55 万对、离婚 351.30 万对，与 2024 年全国数一致，故省份 year 一律记为 2024。",
            "离结比存在三种算法（÷结婚人数、÷结婚对数、÷初婚人数）；本数据只采用「离婚对数 ÷ 结婚登记对数」。",
            "初婚 / 再婚为人数，需除以 2 × 结婚对数才得到占比。",
            "2025 年离婚 274.3 万对为初步数，不宜解读为婚姻稳定性回升。",
            "季度序列 2017Q1–2026Q3，2026Q4 尚未公布。",
        ],
        "files": {
            "marriage_quarterly.csv": "year,quarter,marriages_wan",
            "marriage_annual.csv": "year,marriages_wan,divorces_wan,divorce_marriage_ratio",
            "marriage_provinces.csv": "year,province,marriages_wan,first_marriage_wan,remarriage_wan,divorces_wan,divorce_rate_permille,divorce_marriage_ratio",
        },
    }
    meta_path = DATA_DIR / "marriage_meta.json"
    meta_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"  -> {meta_path.relative_to(ROOT)}")
    print("完成。")


if __name__ == "__main__":
    main()
