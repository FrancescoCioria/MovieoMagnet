var yifyService =  'yify.unblocked.la';//'yts.to';
var cache = {};

var loading = false,
  list,
  interval,
  maxAttempts = 5,
  delay = 60;
  omdbFind = 'http://www.omdbapi.com/?r=json&type=movie&t=',
  yify = 'https://' + yifyService + '/api/v2/list_movies.json?query_term=';

var magnetLink = '<a class="magnet-link" target="_blank"></a>';
var downloadActions = '<div class="download-actions">' + magnetLink + '</div>';

function isLoading() {
  return $('#load-overlay').is(':visible');
};

function isList() {
  return window.location.href.indexOf('movieo.me/movies/') === -1;
};

function getMovieId(value) {
  const regEx = (/\/t\/p\/original\/([^"]+)\.jpg/g);
  return regEx.exec(value)[1];
};

function tick() {
  var _loading = isLoading();
  var _list = isList();
  if (list !== _list || (loading && !_loading)) {
    (isList() ? updateList : updateMoviePage)();
  }
  loading = _loading;
  list = _list;
};

function tryYify(magnetChild, title, imdbID, movieID, attempt) {
  if (attempt < maxAttempts) {
    var url = yify + imdbID;
    function delayed() {
      $.get(url)
      .fail(function(err) {tryYify(magnetChild, title, imdbID, movieID, attempt + 1)})
      .success(function(res) {
        var movie = res.data.movies[0];
        var magnet = '';
        if (movie) {
          var magnet = getMagnetLink(movie.torrents);
        } else {
          console.log('NO_MOVIE', title, imdbID);
        }
        magnetChild.attr('href', magnet);
        magnetChild.attr('class', 'magnet-link' + (magnet ? ' active' : ''));
        cache[movieID] = magnet;
      });
    };
    setTimeout(delayed, delay);
  } else {
    console.log('FAIL: ', title, imdbID);
  }
}

function update(magnetChild, movieID, title, year, i) {
  i = i || 0;
  var magnet = cache[movieID];
  if (magnet) {
    magnetChild.attr('href', magnet);
    magnetChild.attr('class', 'magnet-link' + (magnet ? ' active' : ''));
  } else {
    var omdbURL = omdbFind + title + '&y=' + year.replace('(','').replace(')','');
    $.get(omdbURL)
      .success(function(res) {
        setTimeout(function() {tryYify(magnetChild, title, res.imdbID, movieID, 0)}, i * delay);
      });
  }
};

function updateList() {
  $('.grid-movie-inner').prepend(downloadActions);
  var movieIDs = $('.poster-cont').map(function(i, el) { return getMovieId($(el).attr('data-src')); });
  var years = $('.movie-info .top .title .year');
  $('.movie-info .top .title .name').each(function(i, el) {
    var magnetChild = $('.movie-box:nth-child(' + (i+2) + ') .grid-movie-inner a.magnet-link');
    var movieID = movieIDs[i];
    var title = $(this).text();
    var year = $(years[i]).text();
    update(magnetChild, movieID, title, year, i);
  });
};

function updateMoviePage() {
  $('.movie-title').append(downloadActions);
  var magnetChild = $('.movie-title a.magnet-link');
  var movieID = getMovieId($($('#left img')[0]).attr('src'));
  var title = $('.movie-title .name').text();
  var year = $('.movie-title .year').text().replace('(','').replace(')','');
  update(magnetChild, movieID, title, year);
};

function getMagnetLink(torrents) {
  if (torrents.length) {
    var torrent = torrents[torrents.length - 1];
    return 'magnet:?xt=urn:btih:' + torrent.hash;
  }
  return '';
};


interval = setInterval(tick, 30);
