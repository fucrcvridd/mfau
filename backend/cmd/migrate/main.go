package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"dental-crm/backend/internal/config"
)

func main() {
	action := "up"
	if len(os.Args) > 1 {
		action = os.Args[1]
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		log.Fatalf("postgres: %v", err)
	}

	up, down, err := readMigration()
	if err != nil {
		log.Fatal(err)
	}

	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version BIGINT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`); err != nil {
		log.Fatal(err)
	}

	switch action {
	case "up":
		var applied bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 1)`).Scan(&applied); err != nil {
			log.Fatal(err)
		}
		if applied {
			log.Println("миграция 00001 уже применена")
			return
		}
		if err := execScript(ctx, pool, up); err != nil {
			log.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES (1)`); err != nil {
			log.Fatal(err)
		}
		log.Println("миграция 00001 применена")
	case "down":
		if err := execScript(ctx, pool, down); err != nil {
			log.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `DELETE FROM schema_migrations WHERE version = 1`); err != nil {
			log.Printf("schema_migrations: %v", err)
		}
		log.Println("миграция 00001 откачена")
	case "status":
		var applied bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 1)`).Scan(&applied); err != nil {
			log.Fatal(err)
		}
		if applied {
			fmt.Println("00001_init: applied")
		} else {
			fmt.Println("00001_init: pending")
		}
	default:
		log.Fatalf("неизвестная команда %q (up, down, status)", action)
	}
}

func readMigration() (up, down string, err error) {
	var raw []byte
	var last error
	for _, path := range []string{"migrations/00001_init.sql", "backend/migrations/00001_init.sql"} {
		raw, last = os.ReadFile(path)
		if last == nil {
			break
		}
	}
	if last != nil {
		return "", "", fmt.Errorf("прочитать миграцию: %w", last)
	}
	text := string(raw)
	const upMark = "-- +goose Up"
	const downMark = "-- +goose Down"
	i := strings.Index(text, upMark)
	j := strings.Index(text, downMark)
	if i < 0 || j < 0 || j < i {
		return "", "", fmt.Errorf("в миграции нет маркеров goose Up/Down")
	}
	return strings.TrimSpace(text[i+len(upMark) : j]), strings.TrimSpace(text[j+len(downMark):]), nil
}

func execScript(ctx context.Context, pool *pgxpool.Pool, script string) error {
	for _, stmt := range splitSQL(script) {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("%s: %w", stmt, err)
		}
	}
	return nil
}

func splitSQL(script string) []string {
	parts := strings.Split(script, ";")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		stmt := strings.TrimSpace(part)
		if stmt == "" || strings.TrimSpace(stripComments(stmt)) == "" {
			continue
		}
		out = append(out, stmt)
	}
	return out
}

func stripComments(stmt string) string {
	var b strings.Builder
	for _, line := range strings.Split(stmt, "\n") {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "--") {
			continue
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	return b.String()
}
