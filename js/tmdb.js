// TMDB API 설정
const TMDB_API_KEY = '2d4d8e48233af18b21fb939e508073b5';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// 영화 검색
async function searchMovies(query) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=1`
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('영화 검색 실패:', error);
    return [];
  }
}

// 영화 상세 정보 가져오기
async function getMovieDetails(movieId) {
  try {
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ko-KR`),
      fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=ko-KR`)
    ]);
    
    const movie = await movieResponse.json();
    const credits = await creditsResponse.json();
    
    return {
      ...movie,
      cast: credits.cast.slice(0, 10) // 상위 10명만
    };
  } catch (error) {
    console.error('영화 상세 정보 가져오기 실패:', error);
    return null;
  }
}

// 포스터 URL 생성
function getPosterUrl(posterPath) {
  if (!posterPath) {
    return 'https://via.placeholder.com/300x450?text=No+Poster';
  }
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}
// ========== 예고편 정보 가져오기 ==========
async function getMovieTrailer(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=ko-KR`
        );
        const data = await response.json();
        
        // YouTube 예고편 찾기
        const trailer = data.results.find(
            video => video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        if (trailer) {
            return `https://www.youtube.com/watch?v=${trailer.key}`;
        }
        
        // 한국어 없으면 영어 시도
        const enResponse = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const enData = await enResponse.json();
        const enTrailer = enData.results.find(
            video => video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        if (enTrailer) {
            return `https://www.youtube.com/watch?v=${enTrailer.key}`;
        }
        
        return null;
    } catch (error) {
        console.error('예고편 가져오기 오류:', error);
        return null;
    }
}
