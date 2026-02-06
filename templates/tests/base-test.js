/**
 * base-test.js — 경량 테스트 유틸리티
 *
 * Node.js assert 모듈 기반, 외부 의존성 없음.
 * 각 테스트 파일에서 require하여 사용.
 */

const assert = require('assert');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

/**
 * 테스트 스위트 실행
 * @param {string} name - 스위트 이름
 * @param {Function} fn - 테스트 함수
 */
function describe(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

/**
 * 개별 테스트 실행
 * @param {string} name - 테스트 이름
 * @param {Function} fn - 테스트 함수
 */
function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`    ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.log(`    ✗ ${name}`);
    console.log(`      ${err.message}`);
    failures.push({ name, error: err.message });
  }
}

/**
 * 테스트 결과 요약 출력 및 종료 코드 반환
 */
function summary() {
  console.log('\n  ─────────────────────────────');
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${failedTests}`);
  console.log('  ─────────────────────────────\n');

  if (failures.length > 0) {
    console.log('  Failures:');
    failures.forEach((f, i) => {
      console.log(`    ${i + 1}) ${f.name}: ${f.error}`);
    });
    console.log('');
  }

  return failedTests === 0 ? 0 : 1;
}

/**
 * 간단한 DOM/Canvas mock 생성
 */
function createCanvasMock() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (typeof prop === 'string') {
        return (...args) => {
          calls.push({ method: prop, args });
        };
      }
    },
    set(target, prop, value) {
      calls.push({ set: prop, value });
      target[prop] = value;
      return true;
    }
  });

  return {
    ctx,
    calls,
    canvas: {
      width: 400,
      height: 600,
      getContext: () => ctx
    }
  };
}

module.exports = {
  assert,
  describe,
  it,
  summary,
  createCanvasMock
};
