#!/usr/bin/env bash
# ===========================================================
#  조창현 선생님 저장소(원본) -> 김해윤 선생님 저장소(사본) 동기화
#
#  두 사이트는 콘텐츠가 완전히 같고, 다른 것은 track.js 의
#  ENDPOINT(= 어느 현황판으로 기록을 보낼지) 한 줄뿐이다.
#  그래서 사본은 직접 고치지 않고 이 스크립트로만 갱신한다.
#
#  쓰는 법 : 원본에 commit(+push) 한 뒤
#     bash tools/sync-khy.sh
#
#  · 커밋된 파일만 옮긴다(git archive). 교과서 PDF·_원본 은 .gitignore 라 안 간다.
#  · tools/ 는 사본에 넣지 않는다(학생용 사이트라 필요 없음).
#  · 사본에서 직접 고친 내용은 이 스크립트를 돌리면 지워진다.
# ===========================================================
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIRROR="$(dirname "$SRC")/math-unit-contents-khy"
REPO="https://github.com/j333333766-hub/math-unit-contents-khy.git"

# 김해윤 선생님 현황판(웹앱) 주소 — 사본 스프레드시트에 붙어 있는 배포본
EP_KHY="https://script.google.com/macros/s/AKfycbz66o55isg_5UQUmgNXmC4cHnWPRIG8Rtc37jsOZDUYRmqXnnx8wzSNJD05LV5Rho3o/exec"

GIT=git
command -v gh >/dev/null 2>&1 || export PATH="$PATH:/c/Program Files/GitHub CLI"

echo "원본  : $SRC"
echo "사본  : $MIRROR"

# ---------- 1. 원본이 깨끗한지 ----------
if [ -n "$($GIT -C "$SRC" status --porcelain)" ]; then
  echo "!! 원본에 커밋하지 않은 변경이 있습니다. 먼저 commit 하세요." >&2
  $GIT -C "$SRC" status --short >&2
  exit 1
fi

# ---------- 2. 사본 작업 폴더 준비 ----------
if [ ! -d "$MIRROR/.git" ]; then
  echo "사본 저장소를 처음 내려받습니다..."
  $GIT clone "$REPO" "$MIRROR"
  $GIT -C "$MIRROR" config --local --add 'credential.https://github.com.helper' ''
  $GIT -C "$MIRROR" config --local --add 'credential.https://github.com.helper' \
       '!"/c/Program Files/GitHub CLI/gh.exe" auth git-credential'
else
  $GIT -C "$MIRROR" fetch --quiet origin
  $GIT -C "$MIRROR" reset --hard --quiet origin/main 2>/dev/null || true
fi

# ---------- 3. 원본의 커밋된 파일로 통째로 갈아끼우기 ----------
find "$MIRROR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
$GIT -C "$SRC" archive HEAD | tar -x -C "$MIRROR"
rm -rf "$MIRROR/tools"

# ---------- 4. 다른 점 딱 하나 : 기록을 보낼 현황판 주소 ----------
TRACK="$MIRROR/assets/track.js"
python - "$TRACK" "$EP_KHY" <<'PY'
import io, os, re, sys
p, ep = sys.argv[1], sys.argv[2]
s = io.open(p, encoding="utf-8").read()
new, n = re.subn(r'(var ENDPOINT = ")[^"]+(";)', lambda m: m.group(1) + ep + m.group(2), s, count=1)
assert n == 1, "track.js 에서 ENDPOINT 줄을 못 찾았습니다"
assert ep in new
io.open(p + ".tmp", "w", encoding="utf-8").write(new)
os.replace(p + ".tmp", p)
print("   ENDPOINT -> 김해윤 선생님 현황판")
PY

# ---------- 5. 사본임을 표시 ----------
python - "$MIRROR" <<'PY'
import io, os, sys
m = sys.argv[1]
p = os.path.join(m, "README.md")
s = io.open(p, encoding="utf-8").read()
banner = (
"> ## ⚠️ 이 저장소는 자동 생성된 사본입니다\n"
"> \n"
"> **김해윤 선생님용** 사이트입니다. 원본과 콘텐츠가 완전히 같고,\n"
"> `assets/track.js` 의 학습기록 주소(ENDPOINT) 한 줄만 다릅니다.\n"
"> \n"
"> **여기서 직접 고치지 마세요.** 원본을 고치고 `bash tools/sync-khy.sh` 를 돌리면\n"
"> 이 저장소는 통째로 다시 덮어쓰입니다.\n"
"> \n"
"> - 원본 : https://github.com/j333333766-hub/math-unit-contents\n"
"> - 학생 접속 주소 : https://j333333766-hub.github.io/math-unit-contents-khy/\n\n")
io.open(p + ".tmp", "w", encoding="utf-8").write(banner + s)
os.replace(p + ".tmp", p)
PY

# ---------- 6. 커밋 · 푸시 ----------
cd "$MIRROR"
$GIT add -A
if $GIT diff --cached --quiet; then
  echo "바뀐 것이 없습니다."
  exit 0
fi
SRC_SHA=$($GIT -C "$SRC" rev-parse --short HEAD)
SRC_MSG=$($GIT -C "$SRC" log -1 --pretty=%s)
$GIT commit -q -m "원본 $SRC_SHA 동기화: $SRC_MSG"
$GIT push -q origin HEAD:main
echo "완료 — https://j333333766-hub.github.io/math-unit-contents-khy/ 에 30초~1분 뒤 반영됩니다."
