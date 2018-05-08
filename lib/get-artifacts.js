const env = require('./env');
const CircleCI = require('circleci');
const Promise = require('bluebird');

module.exports = async (options) => {
  await Promise.all(['username','reponame','branchname'].map(d => options[d] ||
    Promise.reject('Missing parameter in getArtifacts: ' + d)));
  const ciToken = env.get(options.username+'/'+options.reponame+':ciToken');
  if (!ciToken) {
    throw 'Missing env in getArtifacts: '+options.username+'/'+options.reponame+':ciToken';
  }
  const ci = new CircleCI({'auth':ciToken});
  const builds = await ci.getBuilds({
      'username': options.username,
      'project': options.reponame
    });
  if (builds.message === 'Project not found') throw 'ciToken invalid';
  const build = builds.filter && builds.filter(function(d) {
      return (d.branch === options.branchname) && (d.outcome === 'success');
    }).shift();
  if (!build) throw 'Failed to find successful build';
  const artifacts = await ci.getBuildArtifacts({
      'username': options.username,
      'project': options.reponame,
      'build_num': build.build_num
    })
    .filter(artifact => artifact.pretty_path.indexOf('cypress.zip') !== -1)
    .map(artifact => {
      artifact.url = artifact.url + '?circle-token=' +
        env.get(options.username+'/'+options.reponame+':ciToken');
      artifact.sha = build.vcs_revision;
      artifact.buildNumber = build.build_num;
      return artifact;
    });
  if (!artifacts || !artifacts.length) throw 'Failed to find artifacts';
  return artifacts;
};
