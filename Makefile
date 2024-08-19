PNPM = pnpm
VSCE = $(PNPM) vsce

.PHONY: all
all: watch

.PHONY: watch
watch:
	$(PNPM) run watch

.PHONY: package
package:
	$(VSCE) package --no-dependencies

.PHONY: clean
clean:
	rm -f *.vsix

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  watch   - Run pnpm watch"
	@echo "  package - Package the extension"
	@echo "  clean   - Remove generated .vsix files"
	@echo "  help    - Show this help message"