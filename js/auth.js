// 현재 사용자
let currentUser = null;

// 허용된 사용자 이메일 리스트
const allowedEmails = [
  'euijoojung@gmail.com',
  // 초대할 사람들 이메일 추가
];

// 사용자 상태 변경 감지
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // 로그인됨
    if (allowedEmails.includes(user.email)) {
      currentUser = user;
      showMainScreen();
      loadMovies();
    } else {
      // 허용되지 않은 사용자
      alert('접근 권한이 없습니다. 관리자에게 문의하세요.');
      await auth.signOut();
    }
  } else {
    // 로그아웃됨
    currentUser = null;
    showAuthScreen();
  }
});

// Google 로그인
document.getElementById('google-login-btn').addEventListener('click', async () => {
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    console.error('로그인 실패:', error);
    alert('로그인에 실패했습니다: ' + error.message);
  }
});

// 로그아웃 확인 함수
async function confirmLogout() {
  const confirmed = confirm('로그아웃 하시겠습니까?');
  if (confirmed) {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('로그아웃에 실패했습니다.');
    }
  }
}

// 화면 전환
function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  
  // 사용자 정보 표시
  const avatar = document.getElementById('user-avatar');
  avatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';
}
