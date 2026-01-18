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
// 영화 예고편 가져오기
async function getMovieTrailer(movieId) {
    try {
        // 한국어 예고편 먼저 시도
        const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=ko-KR`);
        const data = await response.json();
        
        // 한국어 예고편 찾기
        let trailer = data.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        // 한국어 예고편이 없으면 영어로 다시 시도
        if (!trailer) {
            const enResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
            const enData = await enResponse.json();
            trailer = enData.results.find(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            );
        }
        
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    } catch (error) {
        console.error('예고편 로드 오류:', error);
        return null;
    }
}
