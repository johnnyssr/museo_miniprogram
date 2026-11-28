"""生成《用户问题反馈跟踪表》(.xlsx)

三张工作表：
  1. 问题跟踪  —— 主表，含下拉选项（渠道/类型/优先级/模块/状态）与示例行
  2. 填写说明  —— 各列含义与填写规范
  3. 统计汇总  —— 按状态/类型/优先级自动计数（COUNTIF 公式）
运行：python3 docs/gen_feedback_xlsx.py
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

# ── 通用样式 ──────────────────────────────────────────
HEADER_FILL = PatternFill('solid', fgColor='1F3A5F')
HEADER_FONT = Font(color='FFFFFF', bold=True, size=11)
TITLE_FONT = Font(color='1F3A5F', bold=True, size=14)
SUBTLE_FONT = Font(color='888888', size=10)
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
thin = Side(style='thin', color='CCCCCC')
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

# ── 选项集 ────────────────────────────────────────────
CHANNELS = ['小程序端', '后台端', '现场反馈', '电话/微信', '其他']
TYPES = ['Bug缺陷', '功能建议', '内容错误', '使用咨询', '性能/体验', '其他']
PRIORITIES = ['高', '中', '低']
MODULES = ['登录', '数据概览', '展品管理', '新增/编辑', '批量导入', '媒体库', '二维码', '小程序端', '其他']
STATUSES = ['待处理', '处理中', '已解决', '已关闭', '挂起']

COLUMNS = [
    ('序号', 6),
    ('提交日期', 12),
    ('反馈人', 12),
    ('渠道', 12),
    ('类型', 12),
    ('优先级', 8),
    ('模块', 12),
    ('问题描述', 40),
    ('复现步骤', 32),
    ('期望结果', 26),
    ('状态', 10),
    ('处理人', 10),
    ('处理进展/备注', 34),
    ('解决日期', 12),
]

wb = Workbook()

# ════════════════════════════════════════════════════
#  Sheet 1：问题跟踪
# ════════════════════════════════════════════════════
ws = wb.active
ws.title = '问题跟踪'
ws.sheet_view.showGridLines = False

# 标题行
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(COLUMNS))
c = ws.cell(row=1, column=1, value='用户问题 / Bug / 反馈跟踪表')
c.font = TITLE_FONT
c.alignment = Alignment(horizontal='left', vertical='center')
ws.row_dimensions[1].height = 26

ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(COLUMNS))
c2 = ws.cell(row=2, column=1, value='北部湾海洋生态守护站 · 展品管理后台　|　填写规范见「填写说明」工作表')
c2.font = SUBTLE_FONT

HEADER_ROW = 3
for idx, (name, width) in enumerate(COLUMNS, start=1):
    col = get_column_letter(idx)
    ws.column_dimensions[col].width = width
    cell = ws.cell(row=HEADER_ROW, column=idx, value=name)
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = CENTER
    cell.border = BORDER
ws.row_dimensions[HEADER_ROW].height = 22

# 示例行（浅色标注，供参考）
EXAMPLE = [
    1, '2026-09-17', '张老师', '现场反馈', 'Bug缺陷', '高', '二维码',
    '扫描 fish-002 二维码后提示展品不存在', '打开小程序→扫一扫→扫描展位二维码',
    '正确跳转到对应展品详情页', '待处理', '', '（示例行，可删除）', '',
]
EXAMPLE_ROW = HEADER_ROW + 1
example_fill = PatternFill('solid', fgColor='FFF7E6')
for idx, val in enumerate(EXAMPLE, start=1):
    cell = ws.cell(row=EXAMPLE_ROW, column=idx, value=val)
    cell.fill = example_fill
    cell.border = BORDER
    cell.alignment = LEFT if idx in (8, 9, 10, 13) else CENTER

# 预置空白数据行 + 边框 + 序号
FIRST_DATA = EXAMPLE_ROW + 1
LAST_DATA = FIRST_DATA + 199  # 预留 200 行
for r in range(FIRST_DATA, LAST_DATA + 1):
    for idx in range(1, len(COLUMNS) + 1):
        cell = ws.cell(row=r, column=idx)
        cell.border = BORDER
        cell.alignment = LEFT if idx in (8, 9, 10, 13) else CENTER
    # 序号自动填充
    ws.cell(row=r, column=1, value=r - HEADER_ROW)

# 冻结：标题+表头之下、序号列之右
ws.freeze_panes = ws.cell(row=FIRST_DATA, column=2)

# 下拉数据校验（含示例行与全部数据行）
def add_dropdown(col_idx, options):
    letter = get_column_letter(col_idx)
    dv = DataValidation(
        type='list',
        formula1='"%s"' % ','.join(options),
        allow_blank=True,
        showErrorMessage=True,
    )
    dv.error = '请从下拉列表中选择'
    dv.errorTitle = '取值不合法'
    dv.add(f'{letter}{EXAMPLE_ROW}:{letter}{LAST_DATA}')
    ws.add_data_validation(dv)

add_dropdown(4, CHANNELS)     # 渠道
add_dropdown(5, TYPES)        # 类型
add_dropdown(6, PRIORITIES)   # 优先级
add_dropdown(7, MODULES)      # 模块
add_dropdown(11, STATUSES)    # 状态

# 自动筛选
ws.auto_filter.ref = f'A{HEADER_ROW}:{get_column_letter(len(COLUMNS))}{LAST_DATA}'

# ════════════════════════════════════════════════════
#  Sheet 2：填写说明
# ════════════════════════════════════════════════════
ws2 = wb.create_sheet('填写说明')
ws2.sheet_view.showGridLines = False
ws2.column_dimensions['A'].width = 16
ws2.column_dimensions['B'].width = 70

c = ws2.cell(row=1, column=1, value='填写说明')
c.font = TITLE_FONT
ws2.merge_cells('A1:B1')

GUIDE = [
    ('列名', '说明与填写规范'),
    ('序号', '自动递增，通常无需手动修改。'),
    ('提交日期', '收到该问题的日期，格式 2026-09-17。'),
    ('反馈人', '提出问题的人或岗位，如「张老师」「前台」。'),
    ('渠道', '从下拉选择：%s。' % '、'.join(CHANNELS)),
    ('类型', '从下拉选择：%s。' % '、'.join(TYPES)),
    ('优先级', '从下拉选择：高 / 中 / 低。高＝影响正常使用需尽快处理；中＝有影响但可绕过；低＝优化建议。'),
    ('模块', '问题所属功能模块，从下拉选择：%s。' % '、'.join(MODULES)),
    ('问题描述', '清晰描述现象，说明「在哪个页面、做了什么、出现了什么结果」。'),
    ('复现步骤', '按顺序写出重现该问题的操作步骤，便于技术人员定位。'),
    ('期望结果', '本应出现的正确结果或期望的改进效果。'),
    ('状态', '从下拉选择：%s。处理流转：待处理→处理中→已解决→已关闭；无法处理时可置为挂起。' % '、'.join(STATUSES)),
    ('处理人', '负责跟进该问题的人员。'),
    ('处理进展/备注', '记录处理过程、结论、版本号或其他补充信息。'),
    ('解决日期', '问题解决或关闭的日期，格式 2026-09-17。'),
]
start = 3
for i, (k, v) in enumerate(GUIDE):
    r = start + i
    a = ws2.cell(row=r, column=1, value=k)
    b = ws2.cell(row=r, column=2, value=v)
    a.border = BORDER
    b.border = BORDER
    a.alignment = CENTER
    b.alignment = LEFT
    if i == 0:
        a.fill = HEADER_FILL; a.font = HEADER_FONT
        b.fill = HEADER_FILL; b.font = HEADER_FONT
    else:
        a.font = Font(bold=True)
    ws2.row_dimensions[r].height = 30

tip = ws2.cell(row=start + len(GUIDE) + 1, column=1,
               value='提示：新问题请在「问题跟踪」表的空白行中填写；黄色示例行可直接删除。')
tip.font = SUBTLE_FONT
ws2.merge_cells(start_row=start + len(GUIDE) + 1, start_column=1,
                end_row=start + len(GUIDE) + 1, end_column=2)

# ════════════════════════════════════════════════════
#  Sheet 3：统计汇总
# ════════════════════════════════════════════════════
ws3 = wb.create_sheet('统计汇总')
ws3.sheet_view.showGridLines = False
for col, w in (('A', 16), ('B', 10), ('C', 4), ('D', 16), ('E', 10)):
    ws3.column_dimensions[col].width = w

c = ws3.cell(row=1, column=1, value='统计汇总')
c.font = TITLE_FONT

STATUS_COL = get_column_letter(11)  # 状态列 K
TYPE_COL = get_column_letter(5)     # 类型列 E
PRIO_COL = get_column_letter(6)     # 优先级列 F
rng = lambda col: f"问题跟踪!${col}${FIRST_DATA}:${col}${LAST_DATA}"

def block(title, start_col, options, target_col):
    """在 ws3 写一个「维度 + COUNTIF 计数」小表。"""
    r0 = 3
    hc = ws3.cell(row=r0, column=start_col, value=title)
    hc.fill = HEADER_FILL; hc.font = HEADER_FONT; hc.alignment = CENTER; hc.border = BORDER
    cc = ws3.cell(row=r0, column=start_col + 1, value='数量')
    cc.fill = HEADER_FILL; cc.font = HEADER_FONT; cc.alignment = CENTER; cc.border = BORDER
    for i, opt in enumerate(options, start=1):
        a = ws3.cell(row=r0 + i, column=start_col, value=opt)
        b = ws3.cell(row=r0 + i, column=start_col + 1,
                     value=f'=COUNTIF({rng(target_col)},"{opt}")')
        a.border = BORDER; a.alignment = LEFT
        b.border = BORDER; b.alignment = CENTER

block('按状态', 1, STATUSES, STATUS_COL)   # A/B 列
block('按优先级', 4, PRIORITIES, PRIO_COL) # D/E 列

# 按类型（放在状态表下方）
r0 = 3 + len(STATUSES) + 3
hc = ws3.cell(row=r0, column=1, value='按类型')
hc.fill = HEADER_FILL; hc.font = HEADER_FONT; hc.alignment = CENTER; hc.border = BORDER
cc = ws3.cell(row=r0, column=2, value='数量')
cc.fill = HEADER_FILL; cc.font = HEADER_FONT; cc.alignment = CENTER; cc.border = BORDER
for i, opt in enumerate(TYPES, start=1):
    a = ws3.cell(row=r0 + i, column=1, value=opt)
    b = ws3.cell(row=r0 + i, column=2, value=f'=COUNTIF({rng(TYPE_COL)},"{opt}")')
    a.border = BORDER; a.alignment = LEFT
    b.border = BORDER; b.alignment = CENTER

# 总计（非空问题描述行数）
DESC_COL = get_column_letter(8)
tr = 3 + len(STATUSES) + 3 + len(TYPES) + 2
t1 = ws3.cell(row=tr, column=1, value='问题总数')
t1.font = Font(bold=True)
t2 = ws3.cell(row=tr, column=2,
              value=f'=COUNTA(问题跟踪!${DESC_COL}${FIRST_DATA}:${DESC_COL}${LAST_DATA})')
t2.font = Font(bold=True)

note = ws3.cell(row=tr + 2, column=1,
                value='数量随「问题跟踪」表内容自动更新（示例行未计入总数）。')
note.font = SUBTLE_FONT
ws3.merge_cells(start_row=tr + 2, start_column=1, end_row=tr + 2, end_column=5)

# ── 输出 ──────────────────────────────────────────────
out_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '用户问题反馈跟踪表.xlsx'
)
wb.save(out_path)
print(f'已生成：{out_path}')
