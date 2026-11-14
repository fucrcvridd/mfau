package postgres

import (
	"context"

	"dental-crm/backend/internal/model"
)

func (r *Repo) ListStaff(ctx context.Context) ([]model.Staff, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT st.id, st.name, st.role, st.room_id, rm.name
		FROM staff st
		JOIN rooms rm ON rm.id = st.room_id
		ORDER BY st.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Staff, 0)
	for rows.Next() {
		var item model.Staff
		if err := rows.Scan(&item.ID, &item.Name, &item.Role, &item.RoomID, &item.Room); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) ListRooms(ctx context.Context) ([]model.Room, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name FROM rooms ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Room, 0)
	for rows.Next() {
		var item model.Room
		if err := rows.Scan(&item.ID, &item.Name); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) ListServices(ctx context.Context) ([]model.ServiceItem, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, price_rub FROM services ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.ServiceItem, 0)
	for rows.Next() {
		var item model.ServiceItem
		if err := rows.Scan(&item.ID, &item.Name, &item.PriceRub); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) FindStaffByName(ctx context.Context, name string) (model.Staff, error) {
	var item model.Staff
	err := r.pool.QueryRow(ctx, `
		SELECT st.id, st.name, st.role, st.room_id, rm.name
		FROM staff st
		JOIN rooms rm ON rm.id = st.room_id
		WHERE lower(st.name) = lower($1)`, name).
		Scan(&item.ID, &item.Name, &item.Role, &item.RoomID, &item.Room)
	if err != nil {
		return model.Staff{}, mapNotFound(err)
	}
	return item, nil
}

func (r *Repo) FindRoomByName(ctx context.Context, name string) (model.Room, error) {
	var item model.Room
	err := r.pool.QueryRow(ctx, `SELECT id, name FROM rooms WHERE lower(name) = lower($1)`, name).
		Scan(&item.ID, &item.Name)
	if err != nil {
		return model.Room{}, mapNotFound(err)
	}
	return item, nil
}

func (r *Repo) FindServiceByName(ctx context.Context, name string) (model.ServiceItem, error) {
	var item model.ServiceItem
	err := r.pool.QueryRow(ctx, `SELECT id, name, price_rub FROM services WHERE lower(name) = lower($1)`, name).
		Scan(&item.ID, &item.Name, &item.PriceRub)
	if err != nil {
		return model.ServiceItem{}, mapNotFound(err)
	}
	return item, nil
}
