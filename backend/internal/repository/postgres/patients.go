package postgres

import (
	"context"

	"dental-crm/backend/internal/model"
)

const patientCols = `id, name, phone, to_char(birth_date, 'YYYY-MM-DD'), diagnosis, notes`

func scanPatient(row interface{ Scan(dest ...any) error }) (model.Patient, error) {
	var p model.Patient
	err := row.Scan(&p.ID, &p.Name, &p.Phone, &p.Birth, &p.Diagnosis, &p.Notes)
	return p, err
}

func (r *Repo) ListPatients(ctx context.Context) ([]model.Patient, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+patientCols+` FROM patients ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Patient, 0)
	for rows.Next() {
		p, err := scanPatient(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) GetPatient(ctx context.Context, id int64) (model.Patient, error) {
	p, err := scanPatient(r.pool.QueryRow(ctx, `SELECT `+patientCols+` FROM patients WHERE id = $1`, id))
	if err != nil {
		return model.Patient{}, mapNotFound(err)
	}
	return p, nil
}

func (r *Repo) FindPatientByName(ctx context.Context, name string) (model.Patient, error) {
	p, err := scanPatient(r.pool.QueryRow(ctx,
		`SELECT `+patientCols+` FROM patients WHERE lower(name) = lower($1) ORDER BY id LIMIT 1`, name))
	if err != nil {
		return model.Patient{}, mapNotFound(err)
	}
	return p, nil
}

func (r *Repo) CreatePatient(ctx context.Context, in model.PatientInput) (model.Patient, error) {
	p, err := scanPatient(r.pool.QueryRow(ctx, `
		INSERT INTO patients (name, phone, birth_date, diagnosis, notes)
		VALUES ($1, $2, $3::date, $4, $5)
		RETURNING `+patientCols, in.Name, in.Phone, in.Birth, in.Diagnosis, in.Notes))
	if err != nil {
		return model.Patient{}, err
	}
	return p, nil
}

func (r *Repo) UpdatePatientCard(ctx context.Context, id int64, card model.PatientCard) (model.Patient, error) {
	p, err := scanPatient(r.pool.QueryRow(ctx, `
		UPDATE patients SET diagnosis = $2, notes = $3 WHERE id = $1
		RETURNING `+patientCols, id, card.Diagnosis, card.Notes))
	if err != nil {
		return model.Patient{}, mapNotFound(err)
	}
	return p, nil
}
