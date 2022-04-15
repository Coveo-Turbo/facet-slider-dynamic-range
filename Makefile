#!make
include .env
export

default:	| setup build

init:
	cp .env .env.dist

setup:
	npm install

build:
	npm run build

watch:
	npm run watch

serve:
	npm run serve

pack: 
	npm pack

publish:
	npm publish --access public

	
.PHONY: default init setup build serve pack publish