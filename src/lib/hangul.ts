/**
 * 한글 초성 검색 유틸리티
 * 간단한 구현: 텍스트의 초성을 추출하여 검색 쿼리와 비교
 */

const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

function getChosung(char: string) {
    const code = char.charCodeAt(0) - 44032;
    if (code > -1 && code < 11172) {
        return CHOSUNG[Math.floor(code / 588)];
    }
    return char;
}

function getChosungString(str: string) {
    return str.split('').map(getChosung).join('');
}

export function hangulMatch(text: string, query: string) {
    // 1. 일반 포함 검색
    if (text.includes(query)) return true;

    // 2. 초성 검색
    const textChosung = getChosungString(text);
    // 쿼리가 초성만으로 구성되었는지 확인 (간단히)
    // 여기서는 쿼리가 한글 자음 범위에 있는 경우 초성 검색 시도
    if (/[ㄱ-ㅎ]/.test(query)) {
        return textChosung.includes(query);
    }

    return false;
}
