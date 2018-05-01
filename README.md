```
docker run -d \
  -p 80:5555 \
  -e S3_BUCKET=testify-myapp \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  fijimunkii/testify2:latest

curl http://localhost:80/testify\?username\=fijimunkii\&reponame\=myapp\&branchname\=master\&target\=myapp.com
```

# TODO
- sanitize input
