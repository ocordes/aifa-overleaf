#FROM sharelatex/sharelatex:2.4.2
FROM aifajupyter/aifa-overleaf:test

LABEL maintainer=ocordes@astro.uni-bonn.de

# update tlmgr
RUN tlmgr update --self --all

# install full latex
#RUN tlmgr install scheme-full
RUN tlmgr install collection-latex
RUN tlmgr install collection-mathscience
RUN tlmgr install collection-fontsrecommended
RUN tlmgr install collection-langgerman
RUN tlmgr install collection-bibtexextra
RUN tlmgr install collection-formatsextra
RUN tlmgr install collection-fontsextra
RUN tlmgr install collection-fontsrecommended
RUN tlmgr install collection-humanities
RUN tlmgr install collection-latexextra
RUN tlmgr install collection-latexrecommended
RUN tlmgr install collection-luatex
RUN tlmgr install collection-pictures
RUN tlmgr install collection-pstricks
RUN tlmgr install collection-publishers
RUN tlmgr install collection-xetex

# add ldap 
#RUN (cd /usr/lib/node_modules/npm; npm install ldapjs)
RUN npm install ldapjs

# copy the LDAP Auth Manager from
# https://github.com/worksasintended/overleaf_ldap
COPY AuthenticationManager.js /var/www/sharelatex/web/app/src/Features/Authentication/AuthenticationManager.js

# locale corrections
COPY locales/de.json /var/www/sharelatex/web/node_modules/translations-sharelatex/locales/de.json
