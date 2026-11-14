package postgres

import (
	"context"
	"time"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

const appointmentSelect = `
	SELECT a.id, p.name, st.name, to_char(a.visit_time, 'HH24:MI'),
	       rm.name, sv.name, a.status, to_char(a.visit_date, 'YYYY-MM-DD')
	FROM appointments a
	JOIN patients p ON p.id = a.patient_id
	JOIN staff st ON st.id = a.staff_id
	JOIN rooms rm ON rm.id = a.room_id
	JOIN services sv ON sv.id = a.service_id`

func scanAppointment(row interface{ Scan(dest ...any) error }) (model.Appointment, error) {
	var item model.Appointment
	err := row.Scan(&item.ID, &item.Patient, &item.Doctor, &item.Time, &item.Room, &item.Service, &item.Status, &item.Date)
	return item, err
}

func (r *Repo) ListAppointments(ctx context.Context, day *time.Time, doctor string) ([]model.Appointment, error) {
	var dayArg any
	if day != nil {
		dayArg = day.Format("2006-01-02")
	}
	rows, err := r.pool.Query(ctx, appointmentSelect+`
		WHERE ($1::text IS NULL OR a.visit_date = $1::date)
		  AND ($2 = '' OR st.name = $2)
		ORDER BY a.visit_date, a.visit_time, a.id`, dayArg, doctor)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Appointment, 0)
	for rows.Next() {
		item, err := scanAppointment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) GetAppointment(ctx context.Context, id int64) (model.Appointment, error) {
	item, err := scanAppointment(r.pool.QueryRow(ctx, appointmentSelect+` WHERE a.id = $1`, id))
	if err != nil {
		return model.Appointment{}, mapNotFound(err)
	}
	return item, nil
}

func (r *Repo) CreateAppointment(ctx context.Context, in model.AppointmentWrite) (model.Appointment, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO appointments (patient_id, staff_id, room_id, service_id, visit_date, visit_time, status, cost_rub)
		VALUES ($1, $2, $3, $4, $5::date, $6::time, $7, $8)
		RETURNING id`,
		in.PatientID, in.StaffID, in.RoomID, in.ServiceID,
		in.VisitDate.Format("2006-01-02"), in.VisitTime, in.Status, in.CostRub,
	).Scan(&id)
	if err != nil {
		return model.Appointment{}, err
	}
	return r.GetAppointment(ctx, id)
}

func (r *Repo) UpdateAppointment(ctx context.Context, id int64, roomID *int64, status *string) (model.Appointment, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE appointments
		SET room_id = COALESCE($2, room_id),
		    status = COALESCE($3, status)
		WHERE id = $1`, id, roomID, status)
	if err != nil {
		return model.Appointment{}, err
	}
	if tag.RowsAffected() == 0 {
		return model.Appointment{}, repository.ErrNotFound
	}
	return r.GetAppointment(ctx, id)
}
