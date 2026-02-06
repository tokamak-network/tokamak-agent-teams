#!/bin/bash
# run-tests.sh — 모든 *.test.js 파일 실행, 결과 요약
#
# 사용법: bash tests/run-tests.sh
# 상세 로그는 logs/test-results.log에 저장됩니다.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/test-results.log"

mkdir -p "$LOG_DIR"

TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0
FAILED_LIST=""

echo "============================================" | tee "$LOG_FILE"
echo "  Test Runner — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"

# Find and run all test files
for test_file in "$SCRIPT_DIR"/*.test.js; do
  [ -f "$test_file" ] || continue

  TOTAL_FILES=$((TOTAL_FILES + 1))
  filename=$(basename "$test_file")

  echo "" | tee -a "$LOG_FILE"
  echo "▶ Running: $filename" | tee -a "$LOG_FILE"

  # Run test and capture output
  output=$(cd "$PROJECT_DIR" && node "$test_file" 2>&1)
  exit_code=$?

  # Log detailed output to file only
  echo "$output" >> "$LOG_FILE"

  if [ $exit_code -eq 0 ]; then
    PASSED_FILES=$((PASSED_FILES + 1))
    echo "  ✓ PASS: $filename" | tee -a "$LOG_FILE"
  else
    FAILED_FILES=$((FAILED_FILES + 1))
    FAILED_LIST="$FAILED_LIST  ✗ FAIL: $filename\n"
    echo "  ✗ FAIL: $filename (exit code: $exit_code)" | tee -a "$LOG_FILE"
    # Show failure summary on stdout too
    echo "$output" | grep -E "(✗|Error|AssertionError)" | head -5
  fi
done

echo "" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"
echo "  Results: $PASSED_FILES/$TOTAL_FILES passed" | tee -a "$LOG_FILE"

if [ $FAILED_FILES -gt 0 ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "  Failed tests:" | tee -a "$LOG_FILE"
  echo -e "$FAILED_LIST" | tee -a "$LOG_FILE"
  echo "============================================" | tee -a "$LOG_FILE"
  echo "  ❌ TESTS FAILED — DO NOT PUSH" | tee -a "$LOG_FILE"
  exit 1
else
  echo "============================================" | tee -a "$LOG_FILE"
  echo "  ✅ ALL TESTS PASSED" | tee -a "$LOG_FILE"
  exit 0
fi
