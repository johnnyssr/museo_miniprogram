"""生成《展品管理后台操作手册》(.docx) —— 正式书面语版本 V2.0

依据当前后台实际功能重写：数据概览、展品管理（搜索/排序/批量）、
新增与编辑（简述 + 分类下拉 + 多图封面）、批量导入、媒体库、二维码。
运行：python3 docs/gen_manual.py
"""
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
import os

# 全文统一字体：微软雅黑（Windows 自带，中英文均覆盖，不会缺字回退）
FONT_NAME = '微软雅黑'

doc = Document()

# ── 页面设置 ──────────────────────────────────────────
section = doc.sections[0]
section.page_width  = Cm(21)
section.page_height = Cm(29.7)
section.left_margin   = Cm(3)
section.right_margin  = Cm(2.5)
section.top_margin    = Cm(2.5)
section.bottom_margin = Cm(2.5)

# ── 样式辅助 ──────────────────────────────────────────
def h1(text):
    p = doc.add_paragraph()
    p.style = 'Heading 1'
    run = p.add_run(text)
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    return p

def h2(text):
    p = doc.add_paragraph()
    p.style = 'Heading 2'
    run = p.add_run(text)
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x2A, 0x4A, 0x70)
    return p

def h3(text):
    p = doc.add_paragraph()
    p.style = 'Heading 3'
    run = p.add_run(text)
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x35, 0x55, 0x7A)
    return p

def body(text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(11)
    p.paragraph_format.line_spacing = 1.4
    return p

def step(idx, text):
    p = doc.add_paragraph()
    run = p.add_run(f'第 {idx} 步  ')
    run.font.size = Pt(11)
    run.font.bold = True
    run2 = p.add_run(text)
    run2.font.size = Pt(11)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.line_spacing = 1.4
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(text)
    run.font.size = Pt(11)
    p.paragraph_format.left_indent = Cm(0.5 + level * 0.6)
    p.paragraph_format.line_spacing = 1.4
    return p

def note(text):
    p = doc.add_paragraph()
    run = p.add_run('注意：')
    run.font.size = Pt(10.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0xA0, 0x3A, 0x00)
    run2 = p.add_run(text)
    run2.font.size = Pt(10.5)
    run2.font.color.rgb = RGBColor(0xA0, 0x3A, 0x00)
    p.paragraph_format.left_indent = Cm(0.5)
    return p

def blank():
    doc.add_paragraph()

def table_2col(rows, header, widths=None):
    t = doc.add_table(rows=len(rows) + 1, cols=2)
    t.style = 'Table Grid'
    for i, h in enumerate(header):
        cell = t.rows[0].cells[i]
        run = cell.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(10)
        cell.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.rows[ri + 1].cells[ci]
            run = cell.paragraphs[0].add_run(val)
            run.font.size = Pt(10)
    if widths:
        for row in t.rows:
            for ci, w in enumerate(widths):
                row.cells[ci].width = w
    return t

ENTRY_URL = 'https://beibuwan-cloud1-d9g0ig4ad8e90ecde.webapps.tcloudbase.com/#/exhibits'

# ════════════════════════════════════════════════════
#  封面
# ════════════════════════════════════════════════════
p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p_title.add_run('\n\n\n\n展品管理后台\n操作手册')
run.font.size = Pt(28)
run.font.bold = True
run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

blank()
blank()
p_sub = doc.add_paragraph()
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
run2 = p_sub.add_run('北部湾海洋生态守护站')
run2.font.size = Pt(15)
run2.font.color.rgb = RGBColor(0x35, 0x55, 0x7A)

blank()
blank()
blank()
p_meta = doc.add_paragraph()
p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
run3 = p_meta.add_run('文档版本  V2.0\n发布日期  2026 年 9 月\n适用对象  后台运营管理人员')
run3.font.size = Pt(11)
run3.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

doc.add_page_break()

# ════════════════════════════════════════════════════
#  文档说明
# ════════════════════════════════════════════════════
h1('文档说明')
blank()
body('本手册面向展品管理后台的运营管理人员，系统阐述后台各项功能的操作方法与注意事项，供日常内容维护工作参照执行。使用者在阅读本手册前，应已获得系统管理员分配的登录账号。')
blank()
body('本手册涵盖以下内容：登录与退出、数据概览、展品管理（列表检索与批量操作）、展品的新增与编辑、展品删除、批量导入、媒体库管理、二维码生成与导出，以及常见问题处理与相关规范。')
blank()
body('文中「点击」「按钮」「输入框」等均指电脑浏览器界面中的对应元素。凡涉及删除、修改编号等不可逆操作，均在相应章节以「注意」标出，请务必留意。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第一章  系统概述
# ════════════════════════════════════════════════════
h1('第一章  系统概述')
blank()

h2('1.1  系统简介')
body('展品管理后台是一套基于 Web 的内容管理系统，供运营管理人员通过电脑浏览器维护展品信息。管理人员在后台完成展品的录入与更新后，参观者可通过微信小程序扫描二维码或浏览列表，实时查看展品的图文说明、语音讲解与视频介绍。')
blank()

h2('1.2  访问地址')
body('系统部署于公有云，可通过公网直接访问，无需专用网络。后台操作入口地址如下：')
p = doc.add_paragraph()
run = p.add_run(ENTRY_URL)
run.font.size = Pt(10)
run.font.bold = True
run.font.color.rgb = RGBColor(0x00, 0x56, 0xB3)
p.paragraph_format.left_indent = Cm(0.5)
blank()
body('建议将该地址收藏至浏览器书签，便于日常访问。')
blank()

h2('1.3  功能范围')
bullet('数据概览：查看展品总数及含图片、音频、视频的数量统计，并可快速进入常用操作')
bullet('展品管理：查看、检索、排序全部展品，支持编辑、生成二维码、删除，以及多选批量操作')
bullet('新增 / 编辑展品：录入或修改展品编号、名称、简述、分类及图文描述，管理图片、音频、视频')
bullet('批量导入：通过 CSV 表格一次性录入多条展品记录')
bullet('媒体库：集中上传与管理图片、视频、音频文件，并可与展品关联')
bullet('二维码：为展品生成可下载的小程序二维码，支持单个下载与批量打包 / 打印')
blank()

h2('1.4  运行环境要求')
table_2col([
    ['浏览器',   '推荐使用 Chrome、Microsoft Edge 或 Safari 的较新版本，请勿使用老旧或非主流浏览器'],
    ['设备',     '建议使用电脑操作，屏幕较大便于表格与表单的填写'],
    ['网络',     '需保持网络连接畅通，上传媒体文件时尤为重要'],
    ['账号',     '需向系统管理员申请专用登录账号（用户名与密码）'],
], header=['项目', '要求'], widths=[Cm(3.5), Cm(11.5)])
blank()

h2('1.5  界面与导航')
body('登录后，界面左侧为功能导航菜单，右上角为管理员菜单（可退出登录），中间为当前功能的操作区域。左侧菜单包含以下入口：')
blank()
table_2col([
    ['数据概览', '展品数量统计与快捷操作入口'],
    ['展品管理', '展品列表，日常维护的主要工作区'],
    ['批量导入', 'CSV 批量录入展品'],
    ['媒体库',   '下设「图片管理」「视频管理」「音频管理」三个子项'],
], header=['菜单项', '说明'], widths=[Cm(3.2), Cm(11.8)])
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第二章  登录与退出
# ════════════════════════════════════════════════════
h1('第二章  登录与退出')
blank()

h2('2.1  登录系统')
step(1, '打开浏览器，输入系统访问地址。若未登录，页面将自动跳转至登录界面。')
step(2, '在「用户名」与「密码」输入框中填入维护账号信息（见下表）。')
step(3, '点击「登录」按钮。')
step(4, '登录成功后，系统自动进入后台主界面。')
blank()
body('当前后台维护账号如下：')
table_2col([
    ['用户名', 'qianhao'],
    ['密码',   'Qianhao123'],
], header=['项目', '内容'], widths=[Cm(3.5), Cm(11.5)])
blank()
note('本账号供后台运营维护共用，请妥善保管，勿对外泄露。本手册含登录凭据，属内部资料，'
     '请勿公开传播。如需重置密码或新增账号，请联系系统管理员，系统不提供页面自助修改功能。')
blank()

h2('2.2  退出系统')
body('完成操作后，请点击界面右上角的「管理员」菜单，选择「退出登录」。系统将清除当前登录状态并返回登录界面。')
blank()
note('为保障数据安全，操作结束后应及时退出登录，避免因浏览器长时间挂起而被他人误操作。多人共用同一台电脑时尤须注意。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第三章  数据概览
# ════════════════════════════════════════════════════
h1('第三章  数据概览')
blank()
body('登录后默认进入「数据概览」页面。页面上方以卡片形式展示四项统计数据，下方为展品统计表格。')
blank()

h2('3.1  统计卡片')
table_2col([
    ['展品总数', '当前系统中的展品记录总数'],
    ['含图片',   '至少上传或填写了一张图片的展品数量'],
    ['含音频',   '设置了音频的展品数量'],
    ['含视频',   '设置了视频的展品数量'],
], header=['卡片', '含义'], widths=[Cm(3), Cm(12)])
blank()

h2('3.2  展品统计表格与快捷操作')
body('表格逐条列出展品的编号、名称、简述、分类，以及各展品所含图片、音频、视频的数量，便于快速掌握内容完整度。点击任意一行，即可跳转至该展品的编辑页面。')
blank()
body('页面右上角提供「新增展品」与「批量导入」两个快捷按钮，可直接进入对应功能。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第四章  展品管理（列表）
# ════════════════════════════════════════════════════
h1('第四章  展品管理')
blank()
body('点击左侧菜单「展品管理」，进入展品列表页面。此页面是日常内容维护的主要工作区，以表格形式展示全部展品记录。各列含义如下：')
blank()
table_2col([
    ['勾选框', '位于每行最左侧，用于选中展品以执行批量操作'],
    ['图片', '展品封面缩略图；未设置图片时显示「无」'],
    ['编号', '展品业务编号，即二维码所承载的内容，例如 exhibit-001'],
    ['名称', '展品名称'],
    ['简述', '一句话简介，内容过长时鼠标悬停可查看完整文字'],
    ['分类', '展品所属分类，为选填项，可为空'],
    ['操作', '包含「编辑」「二维码」「删除」三个操作按钮'],
], header=['列名', '说明'], widths=[Cm(3), Cm(12)])
blank()

h2('4.1  检索与排序')
body('页面上方提供检索与排序工具，便于在展品较多时快速定位：')
bullet('搜索框：输入名称或编号中的关键字，列表即时筛选出匹配的展品；点击输入框右侧的清除图标可还原全部。')
bullet('排序下拉：可选择「按编号」或「按名称」对列表排序。')
blank()
body('列表底部提供分页控件，展品较多时可翻页查看。')
blank()

h2('4.2  刷新列表')
body('点击页面右上角「刷新」，可从云端重新获取最新数据。新增或修改展品并保存后，列表通常会自动更新；如未及时更新，可手动点击「刷新」。')
blank()

h2('4.3  批量操作')
body('勾选一条或多条展品后，列表上方会出现批量操作栏，显示「已选 N 项」及以下按钮：')
blank()
table_2col([
    ['批量删除',      '一次性删除所有选中的展品。执行前系统弹出确认框，删除后不可恢复。'],
    ['批量导出二维码', '为所有选中的展品生成二维码，并可选择「打包下载 ZIP」或「打印标签页」两种输出方式。'],
], header=['按钮', '说明'], widths=[Cm(3.6), Cm(11.4)])
blank()
note('批量删除为不可逆操作，执行前请仔细核对已选展品，避免误删。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第五章  新增与编辑展品
# ════════════════════════════════════════════════════
h1('第五章  新增与编辑展品')
blank()
body('新增与编辑使用同一套表单。新增展品时，在展品列表或数据概览页面点击「新增展品」；编辑展品时，在列表中找到目标展品点击「编辑」，各字段将自动载入当前数据。')
blank()

h2('5.1  字段说明')
body('标注星号（*）的字段为必填项。')
blank()
table_2col([
    ['展品编号 *', '全局唯一标识，同时作为二维码内容，例如 exhibit-004。新增时填写；'
                   '保存后不可修改（编辑页面中该字段为锁定状态），以确保已印制的二维码持续有效。命名规范详见附录 A。'],
    ['名称 *',     '展品的正式名称，例如「儒艮标本」。'],
    ['简述',       '一句话简介，选填。将显示于列表与小程序展品卡片，建议控制在一行以内。'],
    ['分类',       '从下拉列表中选择，选项为：鱼类、珊瑚、哺乳类、贝类、藻类、其他。选填，可清空。'],
    ['文本描述',   '展品的详细介绍文字，支持多段长文本，可在输入框内换行。'],
    ['图片',       '展品图集，可添加多张。第一张作为封面。支持上传至云存储或填写外部链接。'],
    ['音频',       '语音讲解文件。支持上传或填写外链。留空时小程序不显示音频播放区。'],
    ['视频',       '视频介绍文件。支持上传或填写外链。留空时小程序不显示视频播放区。'],
], header=['字段', '说明'], widths=[Cm(3.2), Cm(11.8)])
blank()

h2('5.2  图片（多图与封面）')
body('图片区域支持添加多张图片，操作方式如下：')
step(1, '点击添加，选择「上传至云存储」上传本地图片，或切换为「外部链接」粘贴已有图片地址。')
step(2, '可重复添加多张，形成图集。')
step(3, '排在第一位的图片即为封面，将显示于列表缩略图及小程序封面位置。')
blank()
note('如需调整封面，请将目标图片调整至第一位。')
blank()

h2('5.3  音频与视频上传')
body('音频、视频的设置方式一致，以音频为例：')
step(1, '在「音频」区域确认当前为「上传至云存储」模式。')
step(2, '点击选择文件，从本地选取待上传的文件。')
step(3, '等待上传进度完成。上传过程中请勿关闭或刷新页面。')
step(4, '如已有外部链接，可切换为「外部链接」模式，将链接地址粘贴至输入框。')
blank()
note('媒体文件上传依赖网络传输，较大文件的上传耗时较长，请耐心等待进度完成后再进行后续操作。')
blank()

h2('5.4  保存与取消')
body('信息填写完毕后，点击「保存」。系统提示保存成功后自动返回展品列表页面。如需放弃录入或修改，点击「取消」即可。')
blank()
body('如仅需修改文字内容（名称、简述、分类、描述等），无需重新上传媒体文件，保持媒体字段原值保存即可。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第六章  删除展品
# ════════════════════════════════════════════════════
h1('第六章  删除展品')
blank()
body('删除展品有两种方式：')
bullet('单个删除：在列表中找到目标展品，点击「删除」，在弹出的确认对话框中点击「删除」执行，点击「取消」放弃。')
bullet('批量删除：勾选多条展品后，点击批量操作栏中的「批量删除」，确认后一并删除。')
blank()
note('删除操作将立即从数据库中移除展品记录，且无法直接恢复。如仅需临时下线展品而保留数据，'
     '建议与技术人员协商采用隐藏或软删除方案，避免直接删除。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第七章  批量导入
# ════════════════════════════════════════════════════
h1('第七章  批量导入')
blank()
body('当需要一次性录入多条展品时，可使用「批量导入」功能，通过 CSV 表格批量创建。点击左侧菜单「批量导入」进入，页面按「下载模板 → 上传解析 → 预览校验 → 确认导入」四个步骤引导操作。')
blank()

h2('7.1  操作步骤')
step(1, '点击「下载 CSV 模板」，保存模板文件。模板含表头及一行示例数据。')
step(2, '用 Excel 或 WPS 打开模板，按行填写展品信息，保存为 CSV 格式。字段含义见附录 C。')
step(3, '返回页面，点击「上传 CSV」，选择填写好的文件。系统自动解析并逐行校验。')
step(4, '在预览表格中查看校验结果：合法行标记为「合法」，不合法行标记为红色并注明原因。')
step(5, '确认无误后，点击「导入 N 条」。系统仅导入合法行，错误行将被跳过。')
blank()

h2('7.2  校验规则')
body('系统对每一行进行如下校验，任一不满足即视为错误行：')
bullet('编号（exhibitId）不能为空')
bullet('名称（name）不能为空')
bullet('编号不能与库中已有展品重复')
bullet('同一文件内编号不能重复')
blank()

h2('7.3  媒体列填写说明')
note('批量导入不会上传本地文件。图片、音频、视频列只能填写已有的 https:// 或 cloud:// 链接。'
     '图片列可填写多张，用竖线「|」分隔，其中第一张作为封面。如需先获得链接，请在「媒体库」中上传文件后取用。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第八章  媒体库
# ════════════════════════════════════════════════════
h1('第八章  媒体库')
blank()
body('媒体库用于集中上传与管理图片、视频、音频文件。左侧菜单「媒体库」下设「图片管理」「视频管理」「音频管理」三个子项，操作方式一致。媒体库既可作为素材仓库，也可将文件直接关联到展品。')
blank()

h2('8.1  上传文件')
step(1, '进入对应的媒体管理页面（图片 / 视频 / 音频）。')
step(2, '将文件拖拽到上传区域，或点击上传区域选择文件，支持一次选择多个。')
step(3, '点击「开始上传」，等待进度完成。')
blank()

h2('8.2  搜索与选择')
body('页面上方的搜索框可按文件名筛选。勾选「全选」可选中当前列出的全部文件，也可逐个勾选。选中后页面显示已选数量及相应操作按钮。')
blank()

h2('8.3  编辑与删除')
bullet('编辑：仅选中一个文件时可用，用于修改文件名等信息。')
bullet('删除选中：删除所有已勾选的文件，删除后不可恢复。')
blank()

h2('8.4  关联展品')
body('媒体库支持将文件与展品建立关联，便于内容组织：')
bullet('按文件名关联展品：点击「按文件名关联展品」，系统依据文件名与展品编号的对应关系批量建立关联。')
bullet('批量对应展品：在「图片管理」中选中多张图片后，可点击「批量对应展品」，将图片批量指派到相应展品。')
blank()
note('使用「按文件名关联」功能前，建议先规范文件命名（如以展品编号命名），以提高匹配准确率。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第九章  展品二维码
# ════════════════════════════════════════════════════
h1('第九章  展品二维码')
blank()
body('系统可为每个展品生成专属的小程序二维码，用于印刷并张贴于展位。参观者使用微信「扫一扫」或小程序内扫码，即可进入对应展品的详情页面。')
blank()

h2('9.1  单个生成与下载')
step(1, '在展品列表中找到目标展品，点击「二维码」，系统弹出二维码窗口并自动生成。')
step(2, '等待二维码图片显示。')
step(3, '点击「下载 PNG」，将图片保存至本地。文件命名格式为 qrcode-展品编号.png。')
blank()
body('二维码为方形小程序二维码，微信原生「扫一扫」与小程序内「扫一扫」均可扫开并跳转到对应展品。')
blank()

h2('9.2  批量导出')
body('在展品列表中勾选多条展品，点击批量操作栏的「批量导出二维码」，可选择以下两种输出方式：')
blank()
table_2col([
    ['打包下载 ZIP', '将所有二维码打包为一个 ZIP 压缩文件下载，包内每张图片以展品编号命名。'],
    ['打印标签页',   '生成一个便于打印的页面，可直接送打印机批量打印。'],
], header=['方式', '说明'], widths=[Cm(3.6), Cm(11.4)])
blank()

h2('9.3  生效条件与验证')
note('小程序二维码需在小程序已发布正式版后方可对外部参观者生效。若尚未发布正式版，扫码可能无法正常跳转。')
blank()
body('正式印刷前，建议先用手机微信扫描屏幕上的二维码，确认能够正确跳转至对应展品后，再批量印刷张贴。'
     '用于印刷时，建议将二维码放大至 5 厘米见方以上，以保证扫码识别的稳定性。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  第十章  常见问题
# ════════════════════════════════════════════════════
h1('第十章  常见问题处理')
blank()

h3('问题一  登录后页面空白或长时间处于加载状态')
body('多因网络连接不畅所致。请检查网络连接后刷新页面重试。如问题持续存在，请保存页面截图并联系技术人员。')
blank()

h3('问题二  上传媒体文件后列表缩略图未显示')
body('文件上传完成后，预览链接可能存在短暂延迟。点击「刷新」按钮重新获取数据后，缩略图即可正常显示。')
blank()

h3('问题三  保存或导入展品时提示编号已存在')
body('表明数据库中已存在相同编号的记录。请更换其他唯一编号，或先核查原有记录以确认是否需要合并或替换。批量导入时，重复编号所在行会被标为错误并跳过。')
blank()

h3('问题四  编辑展品时无法修改编号')
body('展品编号在保存后即锁定，不可修改，以保证已印制二维码持续有效。如确需更改编号，请新建展品并删除原记录，同时重新生成并替换二维码。')
blank()

h3('问题五  扫码后提示展品不存在或无法跳转')
body('请依次核查：其一，展品编号与二维码内容是否一致（区分大小写）；其二，对应展品记录是否已被删除；'
     '其三，小程序是否已发布正式版；其四，小程序是否已更新至最新版本。')
blank()

h3('问题六  批量导入后部分展品未成功')
body('导入完成后系统会提示成功与失败的条数。失败通常因编号重复或字段不合规所致。请根据提示核对 CSV 文件相应行后重新导入。')
blank()

h3('问题七  误删展品后能否恢复')
body('系统当前未设置回收站功能，删除后无法即时恢复。如确需找回，请联系技术人员评估从数据库备份中恢复的可行性。')
blank()

doc.add_page_break()

# ════════════════════════════════════════════════════
#  附录
# ════════════════════════════════════════════════════
h1('附录')
blank()

h2('附录 A  展品编号命名规范')
body('展品编号是展品的唯一标识，同时作为二维码内容，须严格遵守以下规范：')
blank()
table_2col([
    ['允许字符', '英文字母、数字、连字符（-）及下划线（_）'],
    ['禁用字符', '中文、空格、斜线、括号等特殊字符'],
    ['长度上限', '不超过 32 个字符'],
    ['大小写',   '建议统一使用小写，避免混淆'],
    ['命名建议', '采用「类别-序号」格式，如 coral-001、fish-002、turtle-003'],
], header=['规则', '说明'], widths=[Cm(3.2), Cm(11.8)])
blank()
note('展品编号一经确定且二维码已印制，不应再行修改；系统在编辑页面亦将其锁定。')
blank()

h2('附录 B  媒体文件推荐规格')
table_2col([
    ['图片', 'JPG 或 PNG 格式，宽高比约为 4:3 或 1:1，文件大小不超过 5 MB，'
             '分辨率建议在 800 × 600 像素以上'],
    ['音频', 'MP3 格式，码率约 128 kbps，文件大小建议不超过 20 MB'],
    ['视频', 'MP4 格式（H.264 编码），分辨率建议 720p，文件大小建议不超过 100 MB；'
             '亦可直接填写外部视频平台链接'],
], header=['类型', '推荐规格'], widths=[Cm(2.5), Cm(12.5)])
blank()

h2('附录 C  批量导入 CSV 字段说明')
body('模板首行为字段名（英文），请勿改动；自第二行起逐行填写展品数据。各字段含义如下：')
blank()
table_2col([
    ['exhibitId', '展品编号，必填，唯一。规范见附录 A。'],
    ['name',      '展品名称，必填。'],
    ['summary',   '一句话简述，选填。'],
    ['text',      '文本描述，选填。'],
    ['image',     '图片链接，选填。可填多张，用竖线「|」分隔，第一张为封面。仅支持 https:// 或 cloud:// 链接。'],
    ['audioUrl',  '音频链接，选填。仅支持 https:// 或 cloud:// 链接。'],
    ['videoUrl',  '视频链接，选填。仅支持 https:// 或 cloud:// 链接。'],
], header=['字段名', '说明'], widths=[Cm(3.2), Cm(11.8)])
blank()
note('CSV 文件请使用 UTF-8 编码保存，以免中文出现乱码。批量导入不上传本地文件，媒体列须填写已有链接。')
blank()

# ── 输出文件 ────────────────────────────────────────
def _set_run_font(run, name):
    """把中英文字体都设为 name（含 eastAsia，防止中文回退）。"""
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attr in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rfonts.set(qn(attr), name)


def apply_font(document, name):
    # 默认样式兜底
    normal = document.styles['Normal']
    normal.font.name = name
    _set_run_font_on_style(normal, name)
    # 逐段落 / 逐表格单元格设置每个 run
    for p in document.paragraphs:
        for r in p.runs:
            _set_run_font(r, name)
    for t in document.tables:
        for row in t.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        _set_run_font(r, name)


def _set_run_font_on_style(style, name):
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attr in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rfonts.set(qn(attr), name)


apply_font(doc, FONT_NAME)

out_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '展品管理后台操作手册.docx'
)
doc.save(out_path)
print(f'已生成：{out_path}')
