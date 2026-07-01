#!/bin/bash
# Rename Chinese URL path segments to English (git mv)
set -euo pipefail
cd "$(dirname "$0")/.."

mv_if_exists() {
  if [ -e "$1" ]; then
    git mv "$1" "$2"
  fi
}

# --- 09 editorial: files (deepest first) ---
P09="09-教材編審委員會"
DEMO="$P09/1150730-M1-Demo示範"
PRE="$DEMO/00-前置導覽"
HAND="$DEMO/1150730-現場發放"
UNIT="$DEMO/DEMO-單元/M1-1.1"
ASSESS="$DEMO/評量設計"
WORK="$DEMO/學習單"

mv_if_exists "$PRE/邏輯鏈投影簡報.html" "$PRE/logic-chain-slideshow.html"
mv_if_exists "$PRE/M1-1.1-教學鏈投影簡報.html" "$PRE/m1-1-1-teaching-chain-slideshow.html"
mv_if_exists "$PRE/主持者導覽腳本.html" "$PRE/facilitator-preflight-script.html"
mv_if_exists "$PRE/講師導覽學習單.html" "$PRE/instructor-preflight-worksheet.html"
mv_if_exists "$PRE/01-L1至L6-邏輯鏈走讀.html" "$PRE/01-l1-l6-logic-chain.html"
mv_if_exists "$PRE/AGENDA-前置.md" "$PRE/AGENDA-preflight.md"
mv_if_exists "$PRE/ICAP品質審查邏輯鏈對照.md" "$PRE/ICAP-quality-chain-reference.md"

mv_if_exists "$HAND/主持者教學腳本.html" "$HAND/facilitator-teaching-script.html"
mv_if_exists "$HAND/講師學習單.html" "$HAND/instructor-worksheet.html"
mv_if_exists "$HAND/講師閱讀須知.html" "$HAND/instructor-reading-guide.html"

mv_if_exists "$UNIT/單元模板.html" "$UNIT/unit-template.html"
mv_if_exists "$UNIT/完稿範例.html" "$UNIT/final-sample.html"

mv_if_exists "$DEMO/01-Phase0-身分確認.html" "$DEMO/01-phase0-identity.html"
mv_if_exists "$DEMO/02-Phase1-教學內容與步驟.html" "$DEMO/02-phase1-content-and-steps.html"
mv_if_exists "$DEMO/03-Phase2-教學目標ABCD.html" "$DEMO/03-phase2-abcd-objectives.html"
mv_if_exists "$DEMO/04-Phase3-教學方式與學習單.html" "$DEMO/04-phase3-methods-and-worksheets.html"
mv_if_exists "$DEMO/05-Phase4-評量方式設計.html" "$DEMO/05-phase4-assessment-design.html"
mv_if_exists "$DEMO/06-Phase5-產出歸檔與銜接.html" "$DEMO/06-phase5-archive-and-handoff.html"
mv_if_exists "$DEMO/DEMO-SCRIPT-主辦.md" "$DEMO/DEMO-SCRIPT-host.md"

mv_if_exists "$ASSESS/01-考古題範本.html" "$ASSESS/01-archaeology-question-template.html"
mv_if_exists "$ASSESS/02-勾選建檔表.html" "$ASSESS/02-checklist-archive.html"
mv_if_exists "$ASSESS/03-分數與觀察評量表.html" "$ASSESS/03-scoring-observation.html"

mv_if_exists "$WORK/委員實作手冊.html" "$WORK/member-practice-handbook.html"
mv_if_exists "$WORK/評量工具建檔表.html" "$WORK/assessment-tool-archive.html"

mv_if_exists "$P09/教材單元/M1-1.1-示範單元/單元模板.html" "$P09/教材單元/M1-1.1-示範單元/unit-template.html"
mv_if_exists "$P09/教材單元/M1-1.1-示範單元/完稿範例.html" "$P09/教材單元/M1-1.1-示範單元/final-sample.html"
mv_if_exists "$P09/參考講義/M1-1.1-icap-節錄.html" "$P09/參考講義/M1-1.1-icap-excerpt.html"
mv_if_exists "$P09/單元認領矩陣.html" "$P09/unit-claim-matrix.html"

# --- 09 editorial: directories ---
mv_if_exists "$PRE" "$DEMO/00-preflight"
PRE="$DEMO/00-preflight"
mv_if_exists "$HAND" "$DEMO/1150730-handouts"
mv_if_exists "$DEMO/DEMO-單元" "$DEMO/demo-units"
mv_if_exists "$DEMO/評量設計" "$DEMO/assessment-design"
mv_if_exists "$DEMO/學習單" "$DEMO/worksheets"
mv_if_exists "$P09/教材單元/M1-1.1-示範單元" "$P09/教材單元/m1-1-1-demo-unit"
mv_if_exists "$P09/教材單元" "$P09/textbook-units"
mv_if_exists "$P09/參考講義" "$P09/reference-materials"
mv_if_exists "$P09/協作平台" "$P09/collaboration-platform"
mv_if_exists "$DEMO" "$P09/1150730-m1-demo"
mv_if_exists "$P09/1150920-M1-Demo示範" "$P09/1150920-m1-demo"
mv_if_exists "$P09/1151018-M2-單元認領" "$P09/1151018-m2-unit-claim"
mv_if_exists "$P09/1151115-M3-協作審閱" "$P09/1151115-m3-collaborative-review"
mv_if_exists "$P09/1151220-M4-定稿驗收" "$P09/1151220-m4-final-acceptance"
mv_if_exists "$P09" "09-editorial-committee"

# --- 08 evaluation: files ---
P08="08-評核委員會"
H0630="$P08/1150630-現場發放"
H0830="$P08/1150830-會議籌備"

mv_if_exists "$H0630/委員閱讀須知.html" "$H0630/member-reading-guide.html"
mv_if_exists "$H0630/主席主持手冊.html" "$H0630/chair-facilitator-guide.html"
mv_if_exists "$H0630/委員填答手冊.html" "$H0630/member-handbook.html"
mv_if_exists "$H0630/委員填答手冊-完整版.html" "$H0630/member-handbook-full.html"
mv_if_exists "$H0630/委員填答手冊-正文.html" "$H0630/member-handbook-body.html"
mv_if_exists "$H0630/委員填答手冊-附錄.html" "$H0630/member-handbook-appendix.html"

mv_if_exists "$H0830/主席主持手冊.html" "$H0830/chair-facilitator-guide.html"
mv_if_exists "$H0830/委員閱讀須知.html" "$H0830/member-reading-guide.html"
mv_if_exists "$H0830/ABCD-草稿" "$H0830/abcd-drafts"

mv_if_exists "$P08/1150630/01-Phase0-身分確認.html" "$P08/1150630/01-phase0-identity.html"
mv_if_exists "$P08/1150630/02-Phase1-問題共構.html" "$P08/1150630/02-phase1-problem-framing.html"
mv_if_exists "$P08/1150630/03-Phase2-T1-T7.html" "$P08/1150630/03-phase2-scopes-t1-t7.html"
mv_if_exists "$P08/1150630/04-Phase3-任務背書.html" "$P08/1150630/04-phase3-task-endorsement.html"
mv_if_exists "$P08/1150630/05-Phase4-86單元抽樣.html" "$P08/1150630/05-phase4-86-unit-sampling.html"
mv_if_exists "$P08/1150630/06-Phase5-決議.html" "$P08/1150630/06-phase5-resolution.html"

mv_if_exists "$P08/1150830/01-Phase0-身分確認.html" "$P08/1150830/01-phase0-identity.html"
mv_if_exists "$P08/1150830/02-Phase1-第一次會議回顧.html" "$P08/1150830/02-phase1-first-meeting-review.html"
mv_if_exists "$P08/1150830/03-Phase2-86單元優先序.html" "$P08/1150830/03-phase2-86-unit-priority.html"
mv_if_exists "$P08/1150830/04-Phase3-ABCD教學目標.html" "$P08/1150830/04-phase3-abcd-objectives.html"
mv_if_exists "$P08/1150830/05-Phase4-評量設計.html" "$P08/1150830/05-phase4-assessment-design.html"
mv_if_exists "$P08/1150830/06-Phase5-決議.html" "$P08/1150830/06-phase5-resolution.html"

mv_if_exists "$P08/1150630-資料彙整/00-彙整總覽.html" "$P08/1150630-資料彙整/00-compilation-overview.html"
mv_if_exists "$P08/1150630-資料彙整/01-出席與基本資料.html" "$P08/1150630-資料彙整/01-attendance-basics.html"
mv_if_exists "$P08/1150630-資料彙整/02-需求與問題共識.html" "$P08/1150630-資料彙整/02-needs-consensus.html"
mv_if_exists "$P08/1150630-資料彙整/03-七大範疇與任務.html" "$P08/1150630-資料彙整/03-scopes-and-tasks.html"
mv_if_exists "$P08/1150630-資料彙整/04-86單元必要度.html" "$P08/1150630-資料彙整/04-86-unit-necessity.html"
mv_if_exists "$P08/1150630-資料彙整/05-決議與主審認領.html" "$P08/1150630-資料彙整/05-resolution-claims.html"
mv_if_exists "$P08/1150630-資料彙整/06-保留意見與待議.html" "$P08/1150630-資料彙整/06-reservations-pending.html"

# --- 08 evaluation: directories ---
mv_if_exists "$H0630" "$P08/1150630-handouts"
mv_if_exists "$P08/1150630-資料彙整" "$P08/1150630-data-compilation"
mv_if_exists "$H0830" "$P08/1150830-prep"
mv_if_exists "$P08" "08-evaluation-committee"

# --- root misc ---
mv_if_exists "現場簽到" "onsite-checkin-legacy"
mv_if_exists "現場印製" "onsite-print-legacy"
mv_if_exists "視訊委員" "remote-members"

echo "Renames complete."
