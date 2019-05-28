FROM redash/base:latest as extension-installer

# We copy a few of the extension related files,
# including (optionally via the * in the path) a requirements file
COPY bin/install-extensions bin/bundle-extensions requirements_extensions.txt /app/

# Then we install any extension that may or may not be defined
# in an optiona requirements file for extensions.
RUN ./install-extensions
# And finally we copy the extension bundle files to the right location
# where the frontend build process can find them below.
RUN ./bundle-extensions

FROM node:10 as frontend-builder

WORKDIR /frontend
COPY package.json package-lock.json /frontend/
RUN npm install

COPY . /frontend
COPY --from=extension-installer /app/client/app/extensions /frontend/client/app/extensions
RUN npm run build

FROM redash/base:latest

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements*.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi

COPY . /app
COPY --from=frontend-builder /frontend/client/dist /app/client/dist
RUN chown -R redash /app

USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
