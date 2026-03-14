// 허용된 구글 계정 및 백엔드 주소
const ALLOWED_EMAILS = ['semoking@gmail.com', 'minxuan85@gmail.com'];
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbxbFpQb3KzV2ObfUB22N0BmyVpy8EuxXF3G8BwfT-y5XRDkKZ7Gb0d3LOIE33kkthGhJA/exec';

// 앱 전역 상태 변수
let currentUserEmail = '';
let globalData = [];
let globalCategories = [];
let globalCards = [];
let calendar = null;
let expenseChart = null;
let currentCountry = 'KR';
let currentDisplayDate = new Date();
