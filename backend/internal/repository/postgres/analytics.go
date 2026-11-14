package postgres

import (
	"context"
	"time"

	"dental-crm/backend/internal/model"
)

func (r *Repo) ListArchive(ctx context.Context, year, month *int) ([]model.ArchiveRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT a.id, a.visit_date, p.name, st.name, sv.name, a.status, a.cost_rub
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		JOIN staff st ON st.id = a.staff_id
		JOIN services sv ON sv.id = a.service_id
		WHERE a.status = 'Завершен'
		  AND ($1::int IS NULL OR EXTRACT(YEAR FROM a.visit_date)::int = $1)
		  AND ($2::int IS NULL OR EXTRACT(MONTH FROM a.visit_date)::int = $2)
		ORDER BY a.visit_date DESC, a.visit_time DESC, a.id DESC`, year, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.ArchiveRow, 0)
	for rows.Next() {
		var row model.ArchiveRow
		if err := rows.Scan(&row.ID, &row.VisitDate, &row.Patient, &row.Doctor, &row.Service, &row.Status, &row.CostRub); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *Repo) SumDental(ctx context.Context, from, to time.Time) (int64, error) {
	var sum int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(cost_rub), 0)
		FROM appointments
		WHERE status = 'Завершен'
		  AND visit_date >= $1::date
		  AND visit_date < $2::date`, from.Format("2006-01-02"), to.Format("2006-01-02")).Scan(&sum)
	return sum, err
}

func (r *Repo) SumPharmacy(ctx context.Context, from, to time.Time) (int64, error) {
	var sum int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_rub), 0)
		FROM pharmacy_sales
		WHERE sold_on >= $1::date
		  AND sold_on < $2::date`, from.Format("2006-01-02"), to.Format("2006-01-02")).Scan(&sum)
	return sum, err
}

func (r *Repo) DoctorLoad(ctx context.Context, from, to time.Time) ([]model.DoctorLoadRaw, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT st.name, rm.name,
		       COUNT(a.id) FILTER (WHERE a.status IS DISTINCT FROM 'Отменен')
		FROM staff st
		JOIN rooms rm ON rm.id = st.room_id
		LEFT JOIN appointments a
		  ON a.staff_id = st.id
		 AND a.visit_date >= $1::date
		 AND a.visit_date < $2::date
		WHERE st.role LIKE 'Врач%'
		GROUP BY st.id, st.name, rm.name
		ORDER BY st.id`, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.DoctorLoadRaw, 0)
	for rows.Next() {
		var row model.DoctorLoadRaw
		if err := rows.Scan(&row.Name, &row.Room, &row.Appointments); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *Repo) TopServices(ctx context.Context, from, to time.Time) ([]model.ServiceStat, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sv.name, COUNT(*)::int
		FROM appointments a
		JOIN services sv ON sv.id = a.service_id
		WHERE a.status = 'Завершен'
		  AND a.visit_date >= $1::date
		  AND a.visit_date < $2::date
		GROUP BY sv.name
		ORDER BY COUNT(*) DESC, sv.name
		LIMIT 5`, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.ServiceStat, 0)
	for rows.Next() {
		var item model.ServiceStat
		if err := rows.Scan(&item.Name, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repo) ReportCounts(ctx context.Context, day time.Time) (int, int, int, error) {
	var patients, waiting, leads int
	err := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM patients),
			(SELECT COUNT(*) FROM appointments WHERE visit_date = $1::date AND status = 'Ожидает'),
			(SELECT COUNT(*) FROM leads)`, day.Format("2006-01-02")).Scan(&patients, &waiting, &leads)
	return patients, waiting, leads, err
}
