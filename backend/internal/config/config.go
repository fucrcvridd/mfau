// Package config читает настройки процесса.
// Файл .env открывает пакет godotenv: он кладёт KEY=VALUE в окружение,
// а дальше код берёт их через os.Getenv, как обычные переменные.
package config

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPAddr    string
	DatabaseURL string
}

func Load() (Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return Config{}, fmt.Errorf("открыть .env: %w", err)
	}

	cfg := Config{
		HTTPAddr:    getenv("HTTP_ADDR", ":8080"),
		DatabaseURL: os.Getenv("postgres://postgres:27516439@localhost:5433/dental_crm?sslmode=disable"),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL пустой: пропишите его в backend/.env")
	}
	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
