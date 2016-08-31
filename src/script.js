const cache = {};
const ytsCache = {}

let windowHref = null;

const magnetLink = '<a class="magnet-link" target="_blank"></a>';
const downloadActions = '<div class="download-actions">' + magnetLink + '</div>';

const isLoading = () => $('#load-overlay').is(':visible');

const isList = () => window.location.href.match(/movieo.me\/movies\?|movieo.me\/movies$|movieo.me\/movies\/watchlist|movieo.me\/movies\/seenlist|movieo.me\/movies\/blacklist/);

function getMovieId(value) {
  const regEx = (/\/t\/p\/original\/([^"]+)\.jpg/g);
  return regEx.exec(value)[1];
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
  if (!ytsCache[movieID]) {
    const buildUrl = ({ title, year }) => (
      `https://crossorigin.me/https://yts.ag/movie/${title.split(' ').concat(String(year)).map(s => s.toLowerCase().replace(/[().:]/g, '')).join('-')}`
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
      $('#yts-container').html(html);
      const downloadLinks = $('a.magnet-download.download-torrent.magnet');

      const _1080p = (downloadLinks.filter((i, l) => l.title.match(/1080p/))[0] || {}).href;
      const _720p = (downloadLinks.filter((i, l) => l.title.match(/720p/))[0] || {}).href;

      _onSuccess({ _1080p, _720p });
    };

    const onFail = () => {
      $.get(`https://yts.ag/browse-movies/${title}/all/all/0/latest`)
        .success(html => {
          // console.log($.parseHTML(html));
          ytsCache[movieID] = true;
          $('#yts-container').html(html);

          const links = $('.browse-movie-tags');
          const movies = $('.browse-movie-title');

          if (movies.filter((i, el) => $(el).text().toLowerCase() === title.toLowerCase()).length) {
            movies.each((i, el) => {
              if ($(el).text().toLowerCase() === title.toLowerCase()) {
                const _links = $(links.get(i)).children();
                const _1080p = (_links.filter((i, l) => l.title.match(/1080p/))[0] || {}).href;
                const _720p = (_links.filter((i, l) => l.title.match(/720p/))[0] || {}).href;

                _onSuccess({ _1080p, _720p });
              }
            });
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
  } else if (ytsCache[movieID] && ytsCache[movieID] !== 404) {
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
  $('.grid-movie-inner').prepend(downloadActions);
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
  $('.movie-title').append(downloadActions);
  const magnetChild = $('.movie-title a.magnet-link');
  const movieID = getMovieId($($('#left img')[0]).attr('src'));
  const title = $('.movie-title .name').text();
  const year = $('.movie-title .year').text().replace('(','').replace(')','');
  update(magnetChild, movieID, title, year);
};

function main() {
  if (isLoading()) {
    setTimeout(main, 100);
  } else {
    if (isList()) {
      updateList();
    } else {
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
