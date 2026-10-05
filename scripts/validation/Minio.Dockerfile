# CI only: archived official registries/binaries return 401/410.
# Build fixed upstream commits corresponding to the existing production release.
FROM golang:1.25-alpine AS server
RUN apk add --no-cache git
WORKDIR /src
RUN git init && git remote add origin https://github.com/minio/minio.git \
 && git fetch --depth 1 origin 07c3a429bfed433e49018cb0f78a52145d4bedeb \
 && git checkout --detach FETCH_HEAD
RUN CGO_ENABLED=0 go build -o /out/minio .

FROM golang:1.25-alpine AS client
RUN apk add --no-cache git
WORKDIR /src
RUN git init && git remote add origin https://github.com/minio/mc.git \
 && git fetch --depth 1 origin 7394ce0dd2a80935aded936b09fa12cbb3cb8096 \
 && git checkout --detach FETCH_HEAD
RUN CGO_ENABLED=0 go build -o /out/mc .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY --from=server /out/minio /usr/local/bin/minio
COPY --from=client /out/mc /usr/local/bin/mc
ENTRYPOINT ["minio"]
