#!/usr/bin/env python3
import os, sqlite3, zipfile, json, time, struct, hashlib

OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "test-harness", "fixtures", "engram-test-deck.apkg"))
DB  = "/tmp/engram-test-collection.anki2"

NOW=int(time.time()); TODAY=NOW//86400; DECK_ID=1000000042; MODEL_ID=1607392300

CARDS=[("What does EC2 stand for?","Elastic Compute Cloud"),
       ("What does S3 stand for?","Simple Storage Service"),
       ("What is AWS Lambda?","Serverless compute — run code without managing servers"),
       ("What does IAM stand for?","Identity and Access Management"),
       ("What is an AWS Availability Zone?","An isolated data-centre location within a region")]

def cs(s): return struct.unpack(">I",hashlib.sha1(s.encode()).digest()[:4])[0]

if os.path.exists(DB): os.remove(DB)
conn=sqlite3.connect(DB); c=conn.cursor()
c.executescript("""
CREATE TABLE col(id integer primary key,crt integer not null,mod integer not null,scm integer not null,ver integer not null,dty integer not null,usn integer not null,ls integer not null,conf text not null,models text not null,decks text not null,dconf text not null,tags text not null);
CREATE TABLE notes(id integer primary key,guid text not null,mid integer not null,mod integer not null,usn integer not null,tags text not null,flds text not null,sfld integer not null,csum integer not null,flags integer not null,data text not null);
CREATE TABLE cards(id integer primary key,nid integer not null,did integer not null,ord integer not null,mod integer not null,usn integer not null,type integer not null,queue integer not null,due integer not null,ivl integer not null,factor integer not null,reps integer not null,lapses integer not null,left integer not null,odue integer not null,odid integer not null,flags integer not null,data text not null);
CREATE TABLE revlog(id integer primary key,cid integer not null,usn integer not null,ease integer not null,ivl integer not null,lastIvl integer not null,factor integer not null,time integer not null,type integer not null);
CREATE TABLE graves(usn integer not null,oid integer not null,type integer not null);
CREATE INDEX ix_notes_usn on notes(usn);CREATE INDEX ix_cards_usn on cards(usn);CREATE INDEX ix_revlog_usn on revlog(usn);CREATE INDEX ix_cards_nid on cards(nid);CREATE INDEX ix_cards_sched on cards(did,queue,due);CREATE INDEX ix_revlog_cid on revlog(cid);CREATE INDEX ix_notes_csum on notes(csum);
""")
models={str(MODEL_ID):{"id":MODEL_ID,"name":"Engram Basic","type":0,"mod":NOW,"usn":-1,"sortf":0,"did":DECK_ID,"tmpls":[{"name":"Card 1","ord":0,"qfmt":"{{Front}}","afmt":"{{FrontSide}}<hr>{{Back}}","bqfmt":"","bafmt":"","did":None,"bfont":"","bsize":0}],"flds":[{"name":"Front","ord":0,"sticky":False,"rtl":False,"font":"Arial","size":20,"media":[]},{"name":"Back","ord":1,"sticky":False,"rtl":False,"font":"Arial","size":20,"media":[]}],"css":".card{font-family:arial;font-size:20px;}","latexPre":"","latexPost":"","tags":[],"vers":[]}}
decks={"1":{"id":1,"name":"Default","conf":1,"extendNew":10,"extendRev":50,"collapsed":False,"browserCollapsed":False,"usn":0,"lrnToday":[0,0],"revToday":[0,0],"newToday":[0,0],"timeToday":[0,0],"dyn":0,"mod":NOW,"desc":""},str(DECK_ID):{"id":DECK_ID,"name":"Engram E2E Test Deck","conf":1,"extendNew":10,"extendRev":50,"collapsed":False,"browserCollapsed":False,"usn":-1,"lrnToday":[0,0],"revToday":[0,0],"newToday":[0,0],"timeToday":[0,0],"dyn":0,"mod":NOW,"desc":"Auto-generated for isolated E2E testing."}}
dconf={"1":{"id":1,"name":"Default","replayq":True,"lapse":{"leechFails":8,"minInt":1,"delays":[10],"leechAction":0,"mult":0},"rev":{"perDay":200,"ease4":1.3,"fuzz":0.05,"minSpace":1,"ivlFct":1,"maxIvl":36500,"bury":True,"hardFactor":1.2},"timer":0,"maxTaken":60,"usn":0,"new":{"perDay":20,"delays":[1,10],"separate":True,"ints":[1,4,7],"initialFactor":2500,"bury":True,"order":1},"autoplay":True,"mod":NOW}}
c.execute("INSERT INTO col VALUES(1,?,?,?,11,0,-1,0,'{}',?,?,?,'{}');",(NOW,NOW,NOW*1000,json.dumps(models),json.dumps(decks),json.dumps(dconf)))
for i,(front,back) in enumerate(CARDS):
    note_id=DECK_ID*100+i; card_id=DECK_ID*100+50+i
    flds=f"{front}\x1f{back}"
    c.execute("INSERT INTO notes VALUES(?,?,?,?,-1,'',?,?,?,0,'');",(note_id,f"etd{DECK_ID:010d}{i:03d}",MODEL_ID,NOW,flds,front,cs(front)))
    c.execute("INSERT INTO cards VALUES(?,?,?,0,?,-1,2,2,?,10,2500,5,0,0,0,0,0,'');",(card_id,note_id,DECK_ID,NOW,TODAY))
conn.commit(); conn.close()
with zipfile.ZipFile(OUT,"w",zipfile.ZIP_DEFLATED) as zf:
    zf.write(DB,"collection.anki2"); zf.writestr("media","{}")
print(f"Created {OUT}  ({len(CARDS)} cards, deck_id={DECK_ID})")
for i,(f,_) in enumerate(CARDS): print(f"  [{i+1}] {f}")
