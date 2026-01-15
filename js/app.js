// 영화 검색 모달
const searchModal = document.getElementById('search-modal');
const searchBtn = document.getElementById('search-btn');
const addMovieBtn = document.getElementById('add-movie-btn');
const searchInput = document.getElementById('movie-search-input');
const searchResults = document.getElementById('search-results');


// 영화 상세 모달 표시
function showMovieDetail(movieId) {
  console.log('영화 상세:', movieId);
}

// 영화 옵션 메뉴 (URL 입력 및 삭제)
async function showMovieOptions(movieId) {
  const movie = await getMovieData(movieId);
  if (!movie) return;
  
  const action = confirm(
    `"${movie.title}" 옵션:\n\n` +
    `[확인] 영상 링크 입력/수정\n` +
    `[취소] 영화 삭제`
  );
  
  if (action) {
    // 영상 링크 입력
    const videoUrl = prompt(
      `"${movie.title}" 영상 링크를 입력하세요:\n` +
      `(현재: ${movie.externalVideoUrl || '없음'})`,
      movie.externalVideoUrl || ''
    );
    
    if (videoUrl !== null) {
      await updateMovieVideoUrl(movieId, videoUrl);
    }
  } else {
    // 영화 삭제
    const confirmDelete = confirm(`정말로 "${movie.title}"을(를) 삭제하시겠습니까?`);
    if (confirmDelete) {
      await deleteMovie(movieId);
    }
  }
}

// 영화 데이터 가져오기
async function getMovieData(movieId) {
  try {
    const doc = await db.collection('movies').doc(movieId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('영화 데이터 가져오기 실패:', error);
    return null;
  }
}

// 영상 URL 업데이트
async function updateMovieVideoUrl(movieId, videoUrl) {
  try {
    await db.collection('movies').doc(movieId).update({
      externalVideoUrl: videoUrl
    });
    alert('영상 링크가 업데이트되었습니다!');
    loadMovies();
  } catch (error) {
    console.error('영상 링크 업데이트 실패:', error);
    alert('영상 링크 업데이트에 실패했습니다.');
  }
}

// 영화 삭제
async function deleteMovie(movieId) {
  try {
    await db.collection('movies').doc(movieId).delete();
    alert('영화가 삭제되었습니다.');
    loadMovies();
  } catch (error) {
    console.error('영화 삭제 실패:', error);
    alert('영화 삭제에 실패했습니다.');
  }
}


  // TODO: 옵션 메뉴 구현
  console.log('영화 옵션:', movieId);
}
