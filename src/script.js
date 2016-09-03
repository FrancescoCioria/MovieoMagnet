const cache = {};
const ytsCache = {}

// const CORS_PROXY = 'https://crossorigin.me/';
// const CORS_PROXY = 'http://cors.io/?u=';
const CORS_PROXY = 'https://buildocorsproxy.herokuapp.com/';

let windowHref = null;

const magnetLink = '<a class="magnet-link" target="_blank"></a>';
const downloadActions = (className) => `<div class="download-actions ${className || ''}">${magnetLink}</div>`;

const isLoading = () => $('#load-overlay').is(':visible');

const isList = () => {
  const regexps = [
    /movieo.me\/movies\?/,
    /movieo.me\/movies$/,
    /movieo.me\/movies\/watchlist/,
    /movieo.me\/movies\/seenlist/,
    /movieo.me\/movies\/blacklist/,
    /movieo.me\/movies\/info\//
  ];
  return regexps.filter(r => window.location.href.match(r)).length > 0;
};

function getMovieId(value) {
  const regEx = (/\/t\/p\/original\/([^"]+)\.jpg/g);
  return (regEx.exec(value) || [])[1];
};

function runSerial(tasks) {
  let result = Promise.resolve();
  tasks.forEach(task => {
    result = result.then(() => task());
  });
  return result;
}

const scrapeYTS = ({ magnetChild, title, year: _year, movieID }) => {
  const year = parseInt(_year.replace('(', ''));
  if (movieID && !ytsCache[movieID]) {
    const buildUrl = ({ title, year }) => (
      `${CORS_PROXY}https://yts.ag/movie/${title.split(' ').concat(String(year)).map(s => s.toLowerCase().replace(/[().:,;'"]/g, '')).join('-')}`
    );

    const _onSuccess = (({ _1080p, _720p }) => {
      const magnet = _1080p || _720p;
      const text = _1080p ? '1080p' : '720p';

      magnetChild.attr('href', magnet);
      magnetChild.attr('class', 'magnet-link' + (magnet ? ' active' : ''));
      magnetChild.text(text);
      cache[movieID] = { text, magnet };
    });

    const onSuccess = html => {
      ytsCache[movieID] = true;
      $('#yts-container').html($.parseHTML(html)[78].innerHTML);
      const downloadLinks = $('a.magnet-download.download-torrent.magnet');

      const _1080p = (downloadLinks.filter((i, l) => l.title.match(/1080p/))[0] || {}).href;
      const _720p = (downloadLinks.filter((i, l) => l.title.match(/720p/))[0] || {}).href;

      _onSuccess({ _1080p, _720p });
    };

    const onFail = () => {
      $.get(`${CORS_PROXY}https://yts.ag/browse-movies/${title}/all/all/0/latest`)
        .success(html => {
          ytsCache[movieID] = true;
          $('#yts-container').html($.parseHTML(html)[77].innerHTML);

          const links = $('.browse-movie-tags');
          const years = $('.browse-movie-year');
          const movies = $('.browse-movie-title');

          const isMatch = ({ title: _title, year: _year }) => (
            _title.toLowerCase() === title.toLowerCase() ||
            (_year === year &&
              (_title.toLowerCase().indexOf(title.toLowerCase()) !== -1 || title.toLowerCase().indexOf(_title.toLowerCase()) !== -1)
            )
          );

          if (movies.filter((i, el) => isMatch({ title: $(el).text(), year: parseInt($(years.get(i)).text()) })).length) {
            const matches = movies.map((i, el) => {
              if (isMatch({ title: $(el).text(), year: parseInt($(years.get(i)).text()) })) {
                const _links = $(links.get(i)).children();
                const _1080p = (_links.filter((i, l) => l.title.match(/1080p/))[0] || {}).href;
                const _720p = (_links.filter((i, l) => l.title.match(/720p/))[0] || {}).href;

                return () => _onSuccess({ _1080p, _720p });
              }
              return null;
            }).toArray().filter(x => x);
            matches.length > 0 && matches[0]();
          } else {
            ytsCache[movieID] = 404;
          }
        })
        .fail(() => {
          ytsCache[movieID] = 404;
        })
    }

    $.get(buildUrl({ title, year }))
      .success(onSuccess)
      .fail(onFail);
  } else if (movieID && ytsCache[movieID] && ytsCache[movieID] !== 404) {
    const { magnet, text } = cache[movieID];
    magnetChild.attr('href', magnet);
    magnetChild.attr('class', 'magnet-link' + (magnet ? ' active' : ''));
    magnetChild.text(text);
  }

}

function update(magnetChild, movieID, title, year, i) {
  scrapeYTS({ magnetChild, title, year, movieID });
};

function updateList() {
  $('.grid-movie-inner').prepend(downloadActions());
  const movieIDs = $('.poster-cont').map((i, el) => getMovieId($(el).attr('data-src')));
  const years = $('.movie-info .top .title .year');
  const toUpdate = $('.movie-info .top .title .name').map((i, el) => {
    const magnetChild = $('.movie-box:nth-child(' + (i+2) + ') .grid-movie-inner a.magnet-link');
    const movieID = movieIDs[i];
    const title = $(el).text();
    const year = $(years[i]).text();

    return () => update(magnetChild, movieID, title, year, i);
  }).toArray();

  runSerial(toUpdate);
};

function updateMoviePage() {
  $('.info').append(downloadActions('_movie-page'));
  const magnetChild = $('.info a.magnet-link');
  const [, movieID] = /imdb.com\/title\/(.+)/.exec($('.link.tt-parent').get(0).href);
  const title = $('.movie-title').text();
  const _year = $('.genres-year').text().split(' - ');
  const year = _year[_year.length - 1];
  update(magnetChild, movieID, title, year);
};

function main() {
  if (isLoading()) {
    setTimeout(main, 100);
  } else {
    if (isList()) {
      console.log('>>> LIST PAGE');
      updateList();
    } else {
      console.log('>>> MOVIE PAGE');
      updateMoviePage();
    }
  }
}

// START
$('body').append('<div id="yts-container" style="display: none;"></div>');

setInterval(() => {
  if (window.location.href !== windowHref) {
    windowHref = window.location.href;
    main();
  }
}, 30);
