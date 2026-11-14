# Запускать из этой папки:  make run
# или из корня репозитория: make -C backend run
#
# Почему здесь нет godotenv.
# godotenv — это библиотека на Go. У Makefile нет импорта Go-пакетов,
# он только запускает команды. Поэтому .env открывает сама программа
# (см. internal/config/config.go): make вызывает `go run`, а Go вызывает godotenv.Load().

.PHONY: run migrate-up migrate-down migrate-status db-up

run:
	go run ./cmd/api

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

migrate-status:
	go run ./cmd/migrate status

db-up:
	docker compose up -d
