package postgres

import (
	"context"
	"time"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

func (r *Repo) ListPharmacy(ctx context.Context, query string) ([]model.PharmacyItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, stock, unit
		FROM pharmacy_items
		WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
		ORDER BY name`, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.PharmacyItem, 0)
	for rows.Next() {
		var item model.PharmacyItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Stock, &item.Unit); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) ConsumePharmacy(ctx context.Context, id int64) (model.PharmacyItem, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.PharmacyItem{}, err
	}
	defer tx.Rollback(ctx)

	var item model.PharmacyItem
	var price int64
	err = tx.QueryRow(ctx, `
		SELECT id, name, stock, unit, price_rub
		FROM pharmacy_items
		WHERE id = $1
		FOR UPDATE`, id).Scan(&item.ID, &item.Name, &item.Stock, &item.Unit, &price)
	if err != nil {
		return model.PharmacyItem{}, mapNotFound(err)
	}
	if item.Stock == 0 {
		return model.PharmacyItem{}, repository.ErrEmptyStock
	}

	err = tx.QueryRow(ctx, `
		UPDATE pharmacy_items
		SET stock = stock - 1
		WHERE id = $1
		RETURNING id, name, stock, unit`, id).Scan(&item.ID, &item.Name, &item.Stock, &item.Unit)
	if err != nil {
		return model.PharmacyItem{}, err
	}

	soldOn := time.Now().Format("2006-01-02")
	if _, err := tx.Exec(ctx, `
		INSERT INTO pharmacy_sales (item_id, qty, amount_rub, sold_on)
		VALUES ($1, 1, $2, $3::date)`, id, price, soldOn); err != nil {
		return model.PharmacyItem{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return model.PharmacyItem{}, err
	}
	return item, nil
}
