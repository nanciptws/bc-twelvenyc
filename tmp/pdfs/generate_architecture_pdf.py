from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "Twelve_Inc_ELC_Complete_Project_Architecture_A3.pdf"
W, H = landscape(A3)

NAVY = HexColor("#102A43"); BLUE = HexColor("#2867A6"); LBLUE = HexColor("#E8F1FF")
PURPLE = HexColor("#7048A8"); LPURPLE = HexColor("#F3E8FF")
GREEN = HexColor("#25815B"); LGREEN = HexColor("#E7F8F0")
ORANGE = HexColor("#B66A00"); LORANGE = HexColor("#FFF2D8")
RED = HexColor("#B63A3A"); LRED = HexColor("#FFE7E7")
GRAY = HexColor("#59636E"); LGRAY = HexColor("#F3F4F6"); MID = HexColor("#D6DCE2")

c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
c.setTitle("Twelve Inc. ELC Complete Project Architecture")
c.setAuthor("Architecture blueprint generated for Twelve Inc.")

def header(title, subtitle, page):
    c.setFillColor(NAVY); c.rect(0, H-56, W, 56, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 19); c.drawString(28, H-34, title)
    c.setFont("Helvetica", 8.5); c.drawRightString(W-28, H-31, subtitle)
    c.setFillColor(GRAY); c.setFont("Helvetica", 7.5)
    c.drawString(28, 14, "Twelve Inc. - ELC B2B Customer Portal | Architecture blueprint | 20 Nov 2026")
    c.drawRightString(W-28, 14, f"A3 landscape | Page {page} of 7")

def box(x,y,w,h,title,lines,fill=white,stroke=GRAY,title_color=NAVY,font=8.2, tag=None):
    # Diagram coordinates use an 808 pt design grid; expand it across A3 width.
    x = 28 + (x - 28) * 1.5
    w = w * 1.5
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(1); c.roundRect(x,y,w,h,7,fill=1,stroke=1)
    c.setFillColor(title_color); c.setFont("Helvetica-Bold", 10); c.drawString(x+10,y+h-17,title)
    if tag:
        tw=stringWidth(tag,"Helvetica-Bold",6.5)+10; c.setFillColor(stroke); c.roundRect(x+w-tw-7,y+h-18,tw,12,4,fill=1,stroke=0)
        c.setFillColor(white); c.setFont("Helvetica-Bold",6.5); c.drawCentredString(x+w-tw/2-7,y+h-14,tag)
    c.setFillColor(HexColor("#25364A")); c.setFont("Helvetica",font)
    yy=y+h-32
    for item in lines:
        for line in simpleSplit(item,"Helvetica",font,w-20):
            if yy < y+8: break
            c.drawString(x+10,yy,line); yy-=font+3
    return (x,y,w,h)

def arrow(a,b,label="",color=GRAY):
    x1,y1,w1,h1=a; x2,y2,w2,h2=b
    sx=x1+w1 if x2>=x1+w1 else x1+w1/2; sy=y1+h1/2
    ex=x2 if x2>=x1+w1 else x2+w2/2; ey=y2+h2/2 if x2>=x1+w1 else y2+h2
    c.setStrokeColor(color); c.setFillColor(color); c.setLineWidth(1.3); c.line(sx,sy,ex,ey)
    import math
    ang=math.atan2(ey-sy,ex-sx); sz=5
    pts=[(ex,ey),(ex-sz*math.cos(ang-.55),ey-sz*math.sin(ang-.55)),(ex-sz*math.cos(ang+.55),ey-sz*math.sin(ang+.55))]
    p=c.beginPath(); p.moveTo(*pts[0]); p.lineTo(*pts[1]); p.lineTo(*pts[2]); p.close(); c.drawPath(p,fill=1,stroke=0)
    if label:
        c.setFont("Helvetica",6.5); c.setFillColor(color); c.drawCentredString((sx+ex)/2,(sy+ey)/2+4,label)

def legend(y=31):
    items=[("Verified",GREEN),("Required / client rule",BLUE),("Proposed / recommended",PURPLE),("Risk / control",RED)]
    x=28
    for name,col in items:
        c.setFillColor(col); c.rect(x,y,8,8,fill=1,stroke=0); c.setFillColor(GRAY); c.setFont("Helvetica",7); c.drawString(x+12,y+1,name); x+=105

def finish(): c.showPage()

# 1 Cover and evidence
c.setFillColor(NAVY); c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(LBLUE); c.circle(W-100,H-80,170,fill=1,stroke=0); c.setFillColor(LPURPLE); c.circle(W-20,80,210,fill=1,stroke=0)
c.setFillColor(NAVY); c.setFont("Helvetica-Bold",30); c.drawString(52,H-120,"TWELVE INC.")
c.setFont("Helvetica-Bold",25); c.drawString(52,H-158,"ELC B2B CUSTOMER PORTAL")
c.setFont("Helvetica",18); c.drawString(52,H-190,"Complete Project Architecture Blueprint")
c.setFillColor(BLUE); c.roundRect(52,H-245,390,35,8,fill=1,stroke=0); c.setFillColor(white); c.setFont("Helvetica-Bold",13); c.drawString(68,H-232,"A3 LANDSCAPE | CONSOLIDATED | VECTOR PDF")
box(52,85,340,140,"Evidence boundary",[
    "VERIFIED: local BigCommerce Cornerstone/Stencil 6.21.0 theme; custom Account Configurator and Submit Order Request templates; B2B GraphQL company context; storefront GraphQL catalog access.",
    "PUBLIC CHECK (20 Nov 2026): homepage and both reference paths display BigCommerce Coming Soon / Store Guest Access. No preview code supplied.",
    "NOT VERIFIED: authenticated live UI, deployed PHP services, order creation/status IDs, email delivery, full mobile/desktop behavior."
],fill=white,stroke=GREEN,font=8.5,tag="SCOPE")
box(415,85,365,140,"Deliverable map",[
    "1  Overall seven-layer architecture", "2  Registration, domain matching and authentication", "3  Admin configurator and permission enforcement",
    "4  Cart, order, status, reference and notifications", "5  Logical data ownership and relationships", "6  Security, observability and implementation gates"
],fill=white,stroke=PURPLE,font=8.5,tag="7 PAGES")
c.setFillColor(white); c.setFont("Helvetica",8); c.drawString(52,55,"Status notation throughout: [V] verified in supplied artifacts | [R] required by brief | [P] proposed architecture")
c.setFont("Helvetica",7); c.drawRightString(W-28,18,"Page 1 of 7")
finish()

# 2 Overall
header("01. Complete System Architecture","Shared company configuration drives admin and customer behavior",2)
y=H-142; h=62; gap=9; x=28; bw=145
layers=[]
layers.append(box(x,y,bw,h,"CUSTOMER PRESENTATION",["Storefront, login/register", "Catalog, PDP, search, cart", "Submit Order Request"],LBLUE,BLUE,tag="L1"))
layers.append(box(x+bw+gap,y,bw,h,"ADMIN",["Admin role + login", "Company selection", "Account Configurator"],LPURPLE,PURPLE,tag="L2"))
layers.append(box(x+2*(bw+gap),y,bw,h,"AUTH + COMPANY",["Session and email validation", "Existing company match", "Customer-company association"],LGREEN,GREEN,tag="L3"))
layers.append(box(x+3*(bw+gap),y,bw,h,"ACCESS CONTROL",["Company, brand, product", "Backend default-deny", "All routes and cart"],LRED,RED,tag="L4"))
layers.append(box(x+4*(bw+gap),y,bw,h,"ORDER PROCESSING",["Validation + idempotency", "Freight decision + reference", "Order/outbox orchestration"],LGREEN,GREEN,tag="L5"))
for a,b in zip(layers,layers[1:]): arrow(a,b)
bc=box(28,230,235,190,"BIGCOMMERCE",["Stencil storefront + customer session [V]","B2B GraphQL company context [V]","Catalog GraphQL / carts / customers [V]","Order API + configured statuses [R]","B2B company custom extra fields shown at right"],LORANGE,ORANGE,tag="L6")
svc=box(285,230,235,190,"SERVER-SIDE APPLICATION SERVICES",["Registration + domain matching [R]","Authorization policy gateway [P]","Account Configurator API (PHP endpoint visible) [V]","Order Request API (PHP endpoint visible) [V]","Idempotency, reference and reconciliation [P]","Email outbox/dispatcher [P]"],LGREEN,GREEN,tag="BACKEND")
data=box(542,230,238,190,"DATA + EMAIL",["BigCommerce: companies, customers, catalog, carts, orders","Optional durable app store: request ledger, idempotency, reference, attempts, notifications, audit","Email service -> customer","Email service -> ELC_NACR_GLOBAL@twelvenyc.com"],LGRAY,GRAY,tag="L7")
arrow(bc,svc,"API / signed context"); arrow(svc,data,"durable outcomes")
fields=box(28,72,752,126,"BIGCOMMERCE B2B COMPANY - CUSTOM EXTRA FIELDS",[
    "Extra Field: Company Domain  | Purpose: validate registration against an existing company | Example: twelvenyc.com",
    "Flow: BigCommerce B2B Company -> Extra Field: Company Domain -> Email Domain Validation -> Company Matching",
    "Extra Field: Account Configurator | Purpose: exact company brand/product access configuration | Value: versioned JSON",
    "Flow: Twelve Inc. Admin -> Account Configurator -> BigCommerce B2B Company -> Extra Field: Account Configurator -> Brand/Product Access Validation -> Customer Storefront"
],LORANGE,ORANGE,font=8.7,tag="EXACT NAMES")
arrow(bc,fields,"owns",ORANGE); arrow(svc,fields,"read/update",GREEN); legend(); finish()

# 3 Registration + auth
header("02. Customer Registration, Domain Validation and Authentication","No public registration may create a new B2B company",3)
nodes=[]; y=455
labels=[("1. EMAIL",["Customer enters email","Normalize; extract domain"],BLUE,LBLUE),("2. LOOKUP",["Retrieve existing active companies","Read exact field Company Domain"],ORANGE,LORANGE),("3. DECISION",["Require exactly one match","Fail closed on ambiguity/error"],RED,LRED),("4. ASSOCIATE",["Create customer account","Securely link existing company"],GREEN,LGREEN),("5. LOGIN",["BigCommerce authentication","Protected session + company context"],PURPLE,LPURPLE)]
for i,(t,ls,st,fi) in enumerate(labels): nodes.append(box(28+i*152,y,140,80,t,ls,fi,st,tag="R" if i<4 else "V/R"))
for a,b in zip(nodes,nodes[1:]): arrow(a,b)
success=box(420,300,360,110,"SUCCESS PATH",["Verified email ownership + customer account","Existing company association is authoritative","Load exact Extra Field: Account Configurator","Evaluate company/brand/product access before protected content"],LGREEN,GREEN,tag="ALLOW")
failure=box(28,300,365,110,"FAILURE PATH - EXACT COPY",["Never create a company.","We cannot find company details in our records. Kindly contact on elcsupport@twelvenyc.com email address for submitting your sign up request."],LRED,RED,font=9,tag="DENY")
arrow(nodes[2],failure,"no / ambiguous / error",RED); arrow(nodes[3],success,"unique match",GREEN)
box(28,82,752,180,"REQUIRED SECURITY AND EDGE-CASE CONTROLS",[
    "Server-side lookup only; do not trust a client-selected company ID. Domain match establishes eligibility, not identity - retain email verification and authentication.",
    "Normalize lower-case and whitespace; explicitly decide subdomain, alias, multi-domain and consumer-email rules. Require active company status.",
    "Protect against enumeration with uniform responses/rate limits. Audit outcome without logging full secrets or excessive PII.",
    "On every authenticated request, derive customer/company association from trusted context. A customer must never select or access another company.",
    "Live registration UI and association API operation were not accessible and must be validated in a non-production tenant."
],LGRAY,GRAY,font=9,tag="P / DEPENDENCY")
legend(); finish()

# 4 Admin/permissions
header("03. Admin Account Configurator and Permission Architecture","One company policy, enforced everywhere",4)
admin=box(28,410,225,115,"TWELVE INC. ADMIN SIDE",["Admin login + backend RBAC","Search/select existing company [V]","Load current configuration [V]","Select brands/products [V]","Validate conflicts and save"],LPURPLE,PURPLE,tag="ADMIN")
extra=box(290,410,225,115,"BIGCOMMERCE B2B COMPANY",["Extra Field: Company Domain","  registration lookup only","Extra Field: Account Configurator","  brand/product policy JSON"],LORANGE,ORANGE,tag="EXACT")
engine=box(552,410,228,115,"BACKEND POLICY ENGINE",["Resolve trusted company ID","Parse/version/cache policy","Brand + product evaluation","Default deny and revalidate","Customers have no write path"],LRED,RED,tag="P")
arrow(admin,extra,"update Account Configurator",PURPLE); arrow(extra,engine,"retrieve",ORANGE)
targets=[]; titles=["HOME / NAV","BRAND + CATEGORY","PLP / SEARCH","PDP / DIRECT URL","CART","ORDER REQUEST"]
for i,t in enumerate(titles):
    xx=28+(i%3)*257; yy=250-(i//3)*105
    targets.append(box(xx,yy,230,72,t,["Show/serve authorized data only","Backend decision is authoritative"],LBLUE,BLUE,tag="ENFORCE"))
for t in targets: arrow(engine,t,"allow / deny",RED)
box(28,58,752,70,"SAVE CONTRACT AND AUDIT",["Validate company and catalog IDs; version JSON; optimistic concurrency; record actor/time/before-after hash/outcome; invalidate caches. The theme-side Account Permissions field is UI evidence, not sufficient server authorization."],LGRAY,GRAY,font=9,tag="REQUIRED")
legend(); finish()

# 5 Order
header("04. Order Request, BigCommerce Status, Reference and Notifications","One order, one stable reference, two independently retryable emails",5)
form=box(28,425,170,105,"CUSTOM FORM [V]",["Cart snapshot + identity", "Brand/regions/date/address", "Freight + allocations", "Market, notes, attachments", "reCAPTCHA"],LBLUE,BLUE,tag="V")
validate=box(225,425,170,105,"SERVER VALIDATION",["Session/company/cart","Permission + current catalog","Required fields/uploads","Ignore client price/status"],LGREEN,GREEN,tag="P")
idem=box(422,425,170,105,"IDEMPOTENCY",["Unique submission key","Reserve reference e.g. TWV-140","Ledger state machine","Reconcile timeouts"],LPURPLE,PURPLE,tag="P")
decision=box(619,425,161,105,"FREIGHT DECISION",["Checked -> Freight Request","Unchecked -> Order Request","Resolve configured status ID"],LORANGE,ORANGE,tag="R")
for a,b in zip([form,validate,idem],[validate,idem,decision]): arrow(a,b)
order=box(28,260,230,110,"BIGCOMMERCE ORDER",["Create once with customer/company","Validated products + quantities","Configured existing status ID","Persist returned order ID","Do not assume status-definition API"],LORANGE,ORANGE,tag="R / DEP")
ledger=box(285,260,230,110,"ORDER REQUEST LEDGER",["request + idempotency key","reference + order ID","status + attempts + errors","transaction/outbox boundary","recommended durable store"],LGRAY,GRAY,tag="P")
mail=box(542,260,238,110,"EMAIL OUTBOX",["Customer registered email","ELC_NACR_GLOBAL@twelvenyc.com","Same stored reference and snapshot","Retry email only","Record provider result"],LGREEN,GREEN,tag="R / P")
arrow(decision,order,"status mapping",ORANGE); arrow(order,ledger,"order ID + outcome"); arrow(ledger,mail,"after success",GREEN)
box(28,82,752,132,"FAILURE-SAFE STATE FLOW",[
    "RECEIVED -> VALIDATED -> REFERENCE_RESERVED -> ORDER_CREATING -> ORDER_CREATED -> EMAIL_QUEUED -> COMPLETE",
    "Timeout/5xx: reconcile by idempotency/reference before retry. Permanent validation/API failure: mark failed and send no confirmation.",
    "Email failure: retain successful order, retry only outbox record, never call order creation. Duplicate browser submits return the stored reference.",
    "Deployment dependency: confirm that Freight Request and Order Request exist in the target store and map names to numeric IDs through configuration."
],LRED,RED,font=9,tag="CRITICAL")
legend(); finish()

# 6 Data
header("05. Logical Data Architecture and Ownership","BigCommerce is primary; a small durable app store is recommended for orchestration",6)
company=box(28,415,230,115,"B2B COMPANY [BIGCOMMERCE]",["company_id, name, status","Extra Field: Company Domain","Extra Field: Account Configurator","1 company -> many customers","Admin-maintained"],LORANGE,ORANGE,tag="SYSTEM OF RECORD")
customer=box(285,435,225,95,"CUSTOMER + CART [BIGCOMMERCE]",["customer_id -> company_id","email + authenticated session","cart_id -> cart items","Catalog product/brand IDs"],LBLUE,BLUE,tag="API")
config=box(542,435,238,95,"POLICY PROJECTION [DERIVED]",["Parsed configurator schema","Brand permissions","Product permissions","Cache by company + config hash"],LRED,RED,tag="CACHE")
arrow(company,customer,"company membership",ORANGE); arrow(company,config,"Account Configurator",ORANGE)
request=box(28,245,230,115,"ORDER REQUEST [APP STORE P]",["request_id + idempotency key","customer/company/cart snapshot","freight flag + state","created/updated + error","1 -> 1 stable reference"],LPURPLE,PURPLE,tag="DURABLE")
bcorder=box(285,265,225,95,"ORDER [BIGCOMMERCE]",["order_id + customer/company","items + quantities","configured status_id/name","request/reference linkage"],LORANGE,ORANGE,tag="SYSTEM OF RECORD")
notify=box(542,245,238,115,"NOTIFICATIONS [APP STORE P]",["reference + recipient + template","provider ID + attempts","queued/sent/failed timestamps","customer + internal messages","no order recreation on retry"],LGREEN,GREEN,tag="OUTBOX")
arrow(customer,request,"submits",BLUE); arrow(request,bcorder,"creates once",PURPLE); arrow(request,notify,"emits",PURPLE)
box(28,65,752,128,"STORAGE DECISION",[
    "A separate database is not mandatory, but the solution needs durable uniqueness and atomic state for idempotency, stable reference generation, reconciliation and email outbox behavior.",
    "If existing infrastructure supplies those guarantees, reuse it. Do not store authoritative permissions only in browser/local storage.",
    "BigCommerce data is accessed via supported REST/GraphQL APIs. Treat cached catalog/policy data as disposable and invalidate it when Account Configurator changes.",
    "Define retention, backup, privacy, attachment storage and deletion rules before implementation."
],LGRAY,GRAY,font=9,tag="RECOMMENDATION")
legend(); finish()

# 7 Security + roadmap
header("06. Security Architecture, Verification and Delivery Gates","Controls apply across customer, admin, API, data and operations",7)
cols=[(28,"IDENTITY + ACCESS",["Secure authentication/session","Email ownership verification","Trusted customer-company resolution","Admin RBAC; MFA recommended","Default-deny object authorization"],BLUE,LBLUE),
      (222,"APPLICATION",["CSRF and rate limits","Allow-list validation/encoding","Upload size/type/malware policy","Backend brand/product checks","Idempotency + outbox"],GREEN,LGREEN),
      (416,"INTEGRATIONS + DATA",["TLS and least-privilege scopes","Server-held secret manager","No management token in browser","Encryption/retention/backups","Cross-company isolation tests"],ORANGE,LORANGE),
      (610,"OPERATIONS",["Structured redacted logs","Correlation by reference/order","Metrics and actionable alerts","Audit permission changes","Runbooks + reconciliation"],PURPLE,LPURPLE)]
for x,t,ls,st,fi in cols: box(x,375,170,145,t,ls,fi,st,tag="CONTROL")
box(28,210,365,125,"IMPLEMENTATION SEQUENCE",["0 Discovery + tenant/API validation","1 Security/data foundations","2 Registration + company association","3 Account Configurator","4 Storefront authorization","5 Order orchestration + notifications","6 QA, staged release + operations"],LGRAY,GRAY,font=8.8,tag="PLAN")
box(415,210,365,125,"NON-NEGOTIABLE RELEASE GATES",["Exact fields exist: Company Domain; Account Configurator","Custom statuses and numeric IDs confirmed","Concurrent duplicate test creates one order/reference","Cross-company penetration matrix passes","Both emails share reference; retry cannot recreate order","Authenticated desktop/mobile review completed"],LRED,RED,font=8.8,tag="ACCEPTANCE")
box(28,62,752,115,"FINAL VERIFICATION RECORD",[
    "Deliverables: one consolidated 7-page A3 landscape vector PDF; editable Mermaid source; technical documentation; implementation plan.",
    "PDF validation: page size 1190.55 x 841.89 pt (A3 landscape), text extraction, page count and PNG render inspection.",
    "Architecture limitation remains explicit: live storefront is behind Store Guest Access; no inaccessible feature or API capability is presented as confirmed.",
    "Next evidence needed: preview/authenticated access, deployed PHP source, target tenant API scopes/status IDs, mail provider and data-retention decisions."
],LGRAY,GRAY,font=9,tag="HANDOFF")
legend(); finish()

c.save()
print(OUT)
