# Reference review

## Cookiecutter

Adopted: one declarative file defines the project-generation interface; templates stay language/framework-neutral.

Not adopted: remote templates, hooks, dependency installation, or code generation before requirements are approved.

## create-vite

Adopted: runtime and template choices must be explicit rather than inferred from a repository name.

Not adopted: choosing a Vite framework template because this repository has no documented product or browser requirement.

## GitHub starter workflows

Adopted: verification is committed with the bootstrap so every change is checked consistently.

Not adopted: a language-specific workflow before the runtime is selected.
