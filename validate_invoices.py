import csv
from collections import defaultdict

# 读取CSV文件
records = []
with open('invoices_all.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames
    for row in reader:
        records.append(row)

print("=" * 100)
print("发票数据验证报告".center(100))
print("=" * 100)

# 1. 检查部门代码
print("\n【一】部门代码分析")
print("-" * 100)

dept_codes = set(r['department_code'] for r in records)
print(f"共有 {len(dept_codes)} 个不同的部门代码:")
sorted_codes = sorted(dept_codes, key=lambda x: (len(str(x)), str(x)))
print(sorted_codes)

# 识别异常的部门代码
print("\n异常部门代码分析:")
abnormal_depts = []
for code in dept_codes:
    code_str = str(code)
    # 检查是否全为数字
    if not code_str.isdigit():
        abnormal_depts.append((code, "包含非数字字符"))
    # 检查是否为5位
    elif len(code_str) != 5:
        abnormal_depts.append((code, f"长度为{len(code_str)}位，必须为5位"))

if abnormal_depts:
    print(f"\n发现 {len(abnormal_depts)} 个异常部门代码:")
    for code, reason in abnormal_depts:
        # 显示相关记录
        matching = [r for r in records if r['department_code'] == code]
        print(f"  - 代码 '{code}': {reason} ({len(matching)}条记录)")
        for r in matching[:3]:  # 最多显示3条
            print(f"    PO: {r['po_no']:<12} 物料: {r['item_name'][:40]}")
        if len(matching) > 3:
            print(f"    ... 还有 {len(matching)-3} 条记录")
else:
    print("未发现明显异常的部门代码")

# 2. 价格计算验证
print("\n" + "=" * 100)
print("【二】价格计算验证 (含税总价 = 数量 × 含税单价)")
print("-" * 100)

price_errors = []
for i, r in enumerate(records, 2):  # 从第2行开始（第1行是表头）
    try:
        qty = float(r['quantity'])
        unit_price_ex_tax = float(r['unit_price_ex_tax'])
        unit_price_inc_tax = float(r['unit_price_inc_tax'])
        total = float(r['total_amount_inc_tax'])
        po = r['po_no']
        # 使用含税单价计算总价
        calculated = qty * unit_price_inc_tax

        if abs(calculated - total) > 0.1:
            price_errors.append({
                'row': i,
                'po': po,
                'item': r['item_name'],
                'qty': qty,
                'unit_price_ex': unit_price_ex_tax,
                'unit_price_inc': unit_price_inc_tax,
                'total': total,
                'calculated': calculated,
                'diff': total - calculated
            })
    except (ValueError, KeyError) as e:
        price_errors.append({
            'row': i,
            'po': r.get('po_no', 'N/A'),
            'item': r.get('item_name', 'N/A'),
            'error': f"数据解析错误: {e}"
        })

if price_errors:
    print(f"\n发现 {len(price_errors)} 条价格计算错误或数据问题:")
    print(f"{'行号':<6} {'PO单号':<12} {'物料名称':<28} {'数量':<6} {'不含税单价':<12} {'含税单价':<12} {'系统总价':<12} {'计算总价':<12} {'差异':<10}")
    print("-" * 140)
    for err in price_errors:
        if 'error' in err:
            print(f"{err['row']:<6} {err.get('po', 'N/A'):<12} {err['item'][:28]:<28} 数据错误: {err['error']}")
        else:
            print(f"{err['row']:<6} {err.get('po', 'N/A'):<12} {err['item'][:28]:<28} {err['qty']:<6.1f} {err['unit_price_ex']:<12.2f} {err['unit_price_inc']:<12.2f} "
                  f"{err['total']:<12.2f} {err['calculated']:<12.2f} {err['diff']:<10.2f}")
else:
    print("所有价格计算正确！")

# 3. 价格合理性检查
print("\n" + "=" * 100)
print("【三】价格合理性检查")
print("-" * 100)

# 检查含税单价是否小于不含税单价（数据录入错误）
price_swap_errors = []
for i, r in enumerate(records, 2):
    try:
        unit_price_ex_tax = float(r['unit_price_ex_tax'])
        unit_price_inc_tax = float(r['unit_price_inc_tax'])
        # 含税单价应该大于不含税单价
        if unit_price_inc_tax < unit_price_ex_tax:
            price_swap_errors.append({
                'row': i,
                'po': r['po_no'],
                'item': r['item_name'],
                'ex_tax': unit_price_ex_tax,
                'inc_tax': unit_price_inc_tax
            })
    except (ValueError, KeyError):
        pass

if price_swap_errors:
    print(f"\n发现 {len(price_swap_errors)} 条含税单价小于不含税单价（可能是字段值颠倒）:")
    print(f"{'行号':<6} {'PO单号':<12} {'物料名称':<35} {'不含税单价':<12} {'含税单价':<12} {'问题':<10}")
    print("-" * 100)
    for err in price_swap_errors:
        print(f"{err['row']:<6} {err['po']:<12} {err['item'][:35]:<35} {err['ex_tax']:<12.2f} {err['inc_tax']:<12.2f} 字段颠倒!")
else:
    print("未发现含税单价小于不含税单价的记录")

zero_price = []
high_price = []
for i, r in enumerate(records, 2):
    try:
        price = float(r['unit_price_inc_tax'])
        po = r['po_no']
        if price <= 0:
            zero_price.append({'row': i, 'po': po, 'item': r['item_name'], 'price': price})
        elif price > 10000:
            high_price.append({'row': i, 'po': po, 'item': r['item_name'], 'price': price})
    except (ValueError, KeyError):
        pass

if zero_price:
    print(f"\n发现 {len(zero_price)} 条零价格或负价格记录:")
    for z in zero_price[:10]:
        print(f"  行{z['row']}: PO:{z.get('po', 'N/A'):<12} {z['item'][:50]} - 价格: {z['price']}")
    if len(zero_price) > 10:
        print(f"  ... 还有 {len(zero_price)-10} 条")
else:
    print("未发现零价格或负价格")

if high_price:
    print(f"\n发现 {len(high_price)} 条极高单价记录（>10000元）:")
    for h in high_price[:10]:
        print(f"  行{h['row']}: PO:{h.get('po', 'N/A'):<12} {h['item'][:50]} - 单价: {h['price']:.2f} 元")
    if len(high_price) > 10:
        print(f"  ... 还有 {len(high_price)-10} 条")
else:
    print("未发现异常高价格（>10000元）")

# 4. 日期格式检查
print("\n" + "=" * 100)
print("【四】日期格式检查")
print("-" * 100)

date_issues = []
for i, r in enumerate(records, 2):
    date_val = r['invoice_date']
    if 'GMT' in str(date_val) or str(date_val) == 'nan' or str(date_val) == '':
        date_issues.append({'row': i, 'po': r['po_no'], 'date': date_val, 'item': r['item_name']})

if date_issues:
    print(f"\n发现 {len(date_issues)} 条异常日期格式:")
    for d in date_issues[:10]:
        print(f"  行{d['row']}: PO:{d['po']:<12} 日期:{d['date']} - {d['item'][:40]}")
    if len(date_issues) > 10:
        print(f"  ... 还有 {len(date_issues)-10} 条")
else:
    print("日期格式正常")

# 5. 数量异常检查
print("\n" + "=" * 100)
print("【五】数量异常检查")
print("-" * 100)

zero_qty = []
for i, r in enumerate(records, 2):
    try:
        qty = float(r['quantity'])
        if qty <= 0:
            zero_qty.append({'row': i, 'po': r['po_no'], 'item': r['item_name'], 'qty': qty})
    except (ValueError, KeyError):
        pass

if zero_qty:
    print(f"\n发现 {len(zero_qty)} 条零数量或负数量记录:")
    for z in zero_qty[:10]:
        print(f"  行{z['row']}: PO:{z['po']:<12} {z['item'][:50]} - 数量: {z['qty']}")
    if len(zero_qty) > 10:
        print(f"  ... 还有 {len(zero_qty)-10} 条")
else:
    print("未发现零数量或负数量")

# 6. 统计摘要
print("\n" + "=" * 100)
print("【六】数据统计摘要")
print("-" * 100)

total_amount = sum(float(r['total_amount_inc_tax']) for r in records if r['total_amount_inc_tax'])
po_numbers = set(r['po_no'] for r in records)

print(f"总记录数: {len(records)}")
print(f"总金额(含税): {total_amount:.2f} 元")
print(f"部门数量: {len(dept_codes)}")
print(f"订单数量: {len(po_numbers)}")

# 按部门统计
print("\n按部门统计（按总金额降序）:")
dept_stats = defaultdict(lambda: {'count': 0, 'amount': 0.0})
for r in records:
    dept = r['department_code']
    dept_stats[dept]['count'] += 1
    try:
        dept_stats[dept]['amount'] += float(r['total_amount_inc_tax'])
    except (ValueError, KeyError):
        pass

# 排序并显示
sorted_depts = sorted(dept_stats.items(), key=lambda x: x[1]['amount'], reverse=True)
print(f"{'部门代码':<12} {'记录数':<10} {'总金额':<15}")
print("-" * 40)
for dept, stats in sorted_depts:
    print(f"{dept:<12} {stats['count']:<10} {stats['amount']:<15.2f}")

# 7. 检查内六角扳手价格异常
print("\n" + "=" * 100)
print("【七】特定商品价格一致性检查")
print("-" * 100)

# 检查相同商品的不同价格
item_prices = defaultdict(list)
for i, r in enumerate(records, 2):
    item_name = r['item_name'].strip()
    try:
        price = float(r['unit_price_inc_tax'])
        item_prices[item_name].append({'row': i, 'price': price, 'dept': r['department_code']})
    except (ValueError, KeyError):
        pass

# 检查内六角扳手的价格
print("\n内六角扳手价格检查:")
wrench_items = {k: v for k, v in item_prices.items() if '内六角扳手' in k or '内六角' in k}
for item, prices in sorted(wrench_items.items()):
    if len(prices) > 1:
        price_list = [p['price'] for p in prices]
        if max(price_list) != min(price_list):
            print(f"  商品: {item}")
            for p in prices:
                print(f"    行{p['row']}: 部门{p['dept']} - 单价 {p['price']:.2f} 元")

print("\n" + "=" * 100)
print("验证完成")
print("=" * 100)
