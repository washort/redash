FROM redash/base:latest

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY . ./
RUN pip install -r requirements.txt -r requirements_dev.txt
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi
RUN (cd redash-stmo; python setup.py install)


RUN npm install && npm run bundle && npm run build && rm -rf node_modules

# Upgrade node to LTS 6.11.2
RUN cd ~
RUN wget https://nodejs.org/download/release/v6.11.2/node-v6.11.2-linux-x64.tar.gz
RUN sudo tar --strip-components 1 -xzvf node-v* -C /usr/local

# Upgrade npm
RUN npm upgrade npm

RUN npm install && npm run bundle && npm run build && rm -rf node_modules
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
