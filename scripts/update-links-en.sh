#!/bin/bash
# Bulk-update internal links after rename-paths-en.sh
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=$(find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.json' -o -name '*.js' \) \
  ! -path './.git/*' ! -path './node_modules/*')

apply() {
  local from="$1" to="$2"
  for f in $FILES; do
    if grep -qF "$from" "$f" 2>/dev/null; then
      sed -i '' "s|${from}|${to}|g" "$f"
    fi
  done
}

# Top-level dirs (longest first)
apply '09-教材編審委員會' '09-editorial-committee'
apply '08-評核委員會' '08-evaluation-committee'

# Event subdirs
apply '1150730-M1-Demo示範' '1150730-m1-demo'
apply '1150920-M1-Demo示範' '1150920-m1-demo'
apply '1151018-M2-單元認領' '1151018-m2-unit-claim'
apply '1151115-M3-協作審閱' '1151115-m3-collaborative-review'
apply '1151220-M4-定稿驗收' '1151220-m4-final-acceptance'
apply '1150630-現場發放' '1150630-handouts'
apply '1150630-資料彙整' '1150630-data-compilation'
apply '1150830-會議籌備' '1150830-prep'
apply '1150730-現場發放' '1150730-handouts'

# Subdirs (relative segments)
apply '00-前置導覽' '00-preflight'
apply '協作平台' 'collaboration-platform'
apply '參考講義' 'reference-materials'
apply '教材單元/M1-1.1-示範單元' 'textbook-units/m1-1-1-demo-unit'
apply '教材單元' 'textbook-units'
apply 'DEMO-單元' 'demo-units'
apply '評量設計' 'assessment-design'
apply '學習單/' 'worksheets/'

# Files
apply '單元認領矩陣.html' 'unit-claim-matrix.html'
apply '邏輯鏈投影簡報.html' 'logic-chain-slideshow.html'
apply 'M1-1.1-教學鏈投影簡報.html' 'm1-1-1-teaching-chain-slideshow.html'
apply '01-L1至L6-邏輯鏈走讀.html' '01-l1-l6-logic-chain.html'
apply 'AGENDA-前置.md' 'AGENDA-preflight.md'
apply 'ICAP品質審查邏輯鏈對照.md' 'ICAP-quality-chain-reference.md'
apply '主持者導覽腳本.html' 'facilitator-preflight-script.html'
apply '講師導覽學習單.html' 'instructor-preflight-worksheet.html'
apply '主持者教學腳本.html' 'facilitator-teaching-script.html'
apply '講師學習單.html' 'instructor-worksheet.html'
apply '講師閱讀須知.html' 'instructor-reading-guide.html'
apply '委員實作手冊.html' 'member-practice-handbook.html'
apply '評量工具建檔表.html' 'assessment-tool-archive.html'
apply 'M1-1.1-icap-節錄.html' 'M1-1.1-icap-excerpt.html'
apply '單元模板.html' 'unit-template.html'
apply '完稿範例.html' 'final-sample.html'

# 08 handouts
apply '委員填答手冊-完整版.html' 'member-handbook-full.html'
apply '委員填答手冊-正文.html' 'member-handbook-body.html'
apply '委員填答手冊-附錄.html' 'member-handbook-appendix.html'
apply '委員填答手冊.html' 'member-handbook.html'
apply '委員閱讀須知.html' 'member-reading-guide.html'
apply '主席主持手冊.html' 'chair-facilitator-guide.html'

# 08 phases
apply '01-Phase0-身分確認.html' '01-phase0-identity.html'
apply '02-Phase1-問題共構.html' '02-phase1-problem-framing.html'
apply '03-Phase2-T1-T7.html' '03-phase2-scopes-t1-t7.html'
apply '04-Phase3-任務背書.html' '04-phase3-task-endorsement.html'
apply '05-Phase4-86單元抽樣.html' '05-phase4-86-unit-sampling.html'
apply '06-Phase5-決議.html' '06-phase5-resolution.html'
apply '02-Phase1-第一次會議回顧.html' '02-phase1-first-meeting-review.html'
apply '03-Phase2-86單元優先序.html' '03-phase2-86-unit-priority.html'
apply '04-Phase3-ABCD教學目標.html' '04-phase3-abcd-objectives.html'
apply '05-Phase4-評量設計.html' '05-phase4-assessment-design.html'

# 08 data compilation pages
apply '00-彙整總覽.html' '00-compilation-overview.html'
apply '01-出席與基本資料.html' '01-attendance-basics.html'
apply '02-需求與問題共識.html' '02-needs-consensus.html'
apply '03-七大範疇與任務.html' '03-scopes-and-tasks.html'
apply '04-86單元必要度.html' '04-86-unit-necessity.html'
apply '05-決議與主審認領.html' '05-resolution-claims.html'
apply '06-保留意見與待議.html' '06-reservations-pending.html'

# 09 demo phases
apply '02-Phase1-教學內容與步驟.html' '02-phase1-content-and-steps.html'
apply '03-Phase2-教學目標ABCD.html' '03-phase2-abcd-objectives.html'
apply '04-Phase3-教學方式與學習單.html' '04-phase3-methods-and-worksheets.html'
apply '05-Phase4-評量方式設計.html' '05-phase4-assessment-design.html'
apply '06-Phase5-產出歸檔與銜接.html' '06-phase5-archive-and-handoff.html'

# Assessment design files
apply '01-考古題範本.html' '01-archaeology-question-template.html'
apply '02-勾選建檔表.html' '02-checklist-archive.html'
apply '03-分數與觀察評量表.html' '03-scoring-observation.html'

# MD script names
apply 'DEMO-SCRIPT-主辦.md' 'DEMO-SCRIPT-host.md'
apply '06-Phase5-產出歸檔與銜接.html' '06-phase5-archive-and-handoff.html'

# Legacy root folders (if linked)
apply '現場簽到' '現場簽到'
apply '現場印製' 'onsite-print-legacy'
apply '視訊委員' 'remote-members'

echo "Link updates complete."
