.PHONY: all build watch clean

OUT = dist/KonataViewer.html

JS_MODULES = src/constants.js \
             src/models.js    \
             src/demo.js      \
             src/parser.js    \
             src/viewer.js    \
             src/app.js

SRC_FILES = src/index.html src/style.css $(JS_MODULES) \
            $(wildcard examples/*.kanata)

all: build

## Build the standalone HTML file into dist/
build: $(OUT)
	cp dist/* pre-build

$(OUT): $(SRC_FILES) build.js
	node build.js

## Watch src/ and examples/ for changes and rebuild automatically
watch:
	npm run watch

## Remove build output
clean:
	rm -rf dist/

## Show help
help:
	@grep -E '^## ' Makefile | sed 's/## /  /'
