package postgres

import (
	"context"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

const leadSelect = `
	SELECT l.id, l.patient_name, l.phone, sv.name, l.preferred_at
	FROM leads l
	JOIN services sv ON sv.id = l.service_id`

func scanLead(row interface{ Scan(dest ...any) error }) (model.Lead, error) {
	var item model.Lead
	err := row.Scan(&item.ID, &item.Patient, &item.Phone, &item.Service, &item.Date)
	return item, err
}

func (r *Repo) ListLeads(ctx context.Context) ([]model.Lead, error) {
	rows, err := r.pool.Query(ctx, leadSelect+` ORDER BY l.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Lead, 0)
	for rows.Next() {
		item, err := scanLead(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) GetLead(ctx context.Context, id int64) (model.Lead, error) {
	item, err := scanLead(r.pool.QueryRow(ctx, leadSelect+` WHERE l.id = $1`, id))
	if err != nil {
		return model.Lead{}, mapNotFound(err)
	}
	return item, nil
}

func (r *Repo) CreateLead(ctx context.Context, in model.LeadInput, serviceID int64) (model.Lead, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO leads (patient_name, phone, service_id, preferred_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id`, in.Patient, in.Phone, serviceID, in.Date).Scan(&id)
	if err != nil {
		return model.Lead{}, err
	}
	return r.GetLead(ctx, id)
}

func (r *Repo) DeleteLead(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM leads WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return repository.ErrNotFound
	}
	return nil
}
