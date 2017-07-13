module.exports = (function () {

  this.transformSearchResults = data => {
    return _.map(data.opml.body[0].outline, item => {
      return {
        title: item.$.text.trim(), // TODO: replace '&amp;' with '&'
        url: item.$.url
      };
    });
  };

  this.transformFeed = data => {
    // return data;
    if (data.rss) {
      return this.transformRssFeed(data.rss);
    }
    return data;
  };

  this.transformRssFeed = data => {
    return {
      title: data.channel[0].title[0],
      image: data.channel[0].image[0].url[0],
      author: data.channel[0]['itunes:author'][0],
      subtitle: data.channel[0]['itunes:subtitle'][0],
      episodes: _.map(_.filter(data.channel[0].item, item => {
        var content = item['media:content'] || item.enclosure;
        if (true &&
          item.guid && item.guid.length && item.guid[0]._ &&
          item.title && item.title.length &&
          item.pubDate && item.pubDate.length &&
          item['itunes:subtitle'] && item['itunes:subtitle'].length &&
          item['itunes:duration'] && item['itunes:duration'].length &&
          content && content.length && content[0] && content[0].$ && content[0].$.url
        ) return true;
        // else console.log(item);
      }), item => {
        // console.log(item);
        return {
          id: item.guid[0]._,
          title: item.title[0].trim(),
          date: item.pubDate[0],
          subtitle: item['itunes:subtitle'][0].trim(),
          // description / itunes:summary
          duration: item['itunes:duration'][0],
          url: (item['media:content'] || item.enclosure)[0].$.url
        };
      })
    };
  };

  return this;
})();
