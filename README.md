# CRISPR Crunch

## Deployment with rclone

First create the S3-compatible bucket:

```bash
rclone mkdir digitalocean:play-curious-crispr-crunch
```

Basic deployment `yarn deploy`.

For more complex deployment

To deploy without checking

```bash
rclone --progress copy --s3-acl public-read dist digitalocean:play-curious-crispr-crunch --no-check-dest
```

To deploy with checking

```bash
rclone --progress sync --s3-acl public-read dist digitalocean:play-curious-crispr-crunch
```

## Licensing

Blockchain Battle is open source, under the GPL v3 license.

## Copyright

Copyright 2019 by Play Curious.
