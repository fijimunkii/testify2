const env = require('./env');
const request = require('bluebird').promisifyAll(require('request'),{multiArgs:true});

module.exports = async (options) => {
  ['username','reponame','rev','state','targetUrl','description']
    .map(d => { if (!options[d]) throw 'Missing option in sendStatus: '+d; });
  const tokenpath = options.username + '/' + options.reponame + ':statusToken';
  const oauthToken = env.get(tokenpath);
  if (!oauthToken) throw 'Missing env in sendStatus:'+tokenpath;
  await request.postAsync({
    url: 'https://api.github.com/repos/' +
        options.username + '/' + options.reponame + '/statuses/' + options.rev,
      headers: {
        Authorization: 'token ' + oauthToken,
        'User-Agent': 'testify'
      },
      body: {
        state: options.state,
        target_url: options.targetUrl,
        description: String(options.description||'').substring(0,140),
        context: 'testify'
      },
      json: true
    })
    .spread((res, body) => { if (res.statusCode !== 201) console.log(`Could not sendStatus: ${body}`); });
};
