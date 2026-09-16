"""Build the linked resume from editable local content. Requires reportlab."""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT

root=Path(__file__).resolve().parent.parent
data=json.loads((root/'content/resume.json').read_text(encoding='utf-8'))
styles={
    'name':ParagraphStyle('name',fontName='Helvetica-Bold',fontSize=23,leading=27,spaceAfter=5),
    'contact':ParagraphStyle('contact',fontName='Helvetica',fontSize=8.6,leading=12,spaceAfter=8),
    'body':ParagraphStyle('body',fontName='Helvetica',fontSize=9.5,leading=12,spaceAfter=4),
    'section':ParagraphStyle('section',fontName='Helvetica-Bold',fontSize=10.4,leading=14,spaceBefore=7,spaceAfter=2,keepWithNext=True),
    'job':ParagraphStyle('job',fontName='Helvetica-Bold',fontSize=10,leading=13,spaceBefore=7,spaceAfter=2,keepWithNext=True),
    'date':ParagraphStyle('date',fontName='Helvetica-Oblique',fontSize=9.3,leading=12,spaceAfter=5,keepWithNext=True),
    'bullet':ParagraphStyle('bullet',fontName='Helvetica',fontSize=9.5,leading=12,leftIndent=12,firstLineIndent=-9,spaceAfter=2),
}
story=[]
def add(text,style='body'):
    story.append(Paragraph(text,styles[style]))
    if style=='section':
        rule=HRFlowable(width='100%',thickness=0.45,color=HexColor('#9aa3a6'),spaceAfter=5)
        rule.keepWithNext=True
        story.append(rule)
add(escape(data['name'].upper()),'name')
contact=escape(data['contact'])
for label,url in [('linkedin.com/in/mshao','https://linkedin.com/in/mshao'),('michaelshao.com','https://michaelshao.com')]:
    contact=contact.replace(label,f'<a href="{url}" color="#1f5a54">{label}</a>')
add(contact,'contact')
add('PROFESSIONAL SUMMARY','section')
add(escape(data['summary']))
add('CORE COMPETENCIES','section')
for item in data['competencies']:
    add(f'<b>{escape(item["label"])}:</b> {escape(item["text"])}')
add('PROFESSIONAL EXPERIENCE','section')
for i,job in enumerate(data['jobs']):
    if i==2:
        story.append(PageBreak())
        add('PROFESSIONAL EXPERIENCE (CONTINUED)','section')
    add(escape(job['company']+' - '+job['title']),'job')
    # A current role with no supplied description must not drag the next job onto its page.
    date_style='date' if job['description'] or job['bullets'] else 'body'
    add(escape(job['date']),date_style)
    if job['description']: add(escape(job['description']))
    for bullet in job['bullets']:
        label,sep,rest=bullet.partition(':')
        add('&#8226; '+(f'<b>{escape(label)}:</b>{escape(rest)}' if sep else escape(bullet)),'bullet')
add('EDUCATION','section')
add(escape(data['education']))
def footer(canvas,doc):
    canvas.saveState()
    canvas.setFont('Helvetica',8)
    canvas.setFillColor(HexColor('#51646c'))
    canvas.drawString(45,24,'Michael Shao')
    canvas.drawRightString(567,24,str(doc.page))
    canvas.restoreState()
doc=SimpleDocTemplate(str(root/'ms-resume.pdf'),pagesize=(612,792),rightMargin=45,leftMargin=45,topMargin=35,bottomMargin=37,
    title='Michael Shao - Resume',author='Michael Shao')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print('Updated ms-resume.pdf from content/resume.json')
