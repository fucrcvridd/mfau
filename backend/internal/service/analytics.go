package service

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"dental-crm/backend/internal/model"
)

func (s *Service) ListArchive(ctx context.Context, yearStr, monthStr string) ([]model.ArchiveRecord, error) {
	var year, month *int
	yearStr = strings.TrimSpace(yearStr)
	monthStr = strings.TrimSpace(monthStr)
	if yearStr != "" && yearStr != "Все годы" {
		y, err := strconv.Atoi(yearStr)
		if err != nil || y < 2000 || y > 2100 {
			return nil, invalid("некорректный год")
		}
		year = &y
	}
	if monthStr != "" && monthStr != "Все месяцы" {
		m, err := monthNumber(monthStr)
		if err != nil {
			return nil, err
		}
		month = &m
	}

	rows, err := s.repo.ListArchive(ctx, year, month)
	if err != nil {
		return nil, err
	}
	out := make([]model.ArchiveRecord, 0, len(rows))
	for _, row := range rows {
		m := int(row.VisitDate.Month())
		out = append(out, model.ArchiveRecord{
			ID:      row.ID,
			Year:    strconv.Itoa(row.VisitDate.Year()),
			Month:   ruMonths[m],
			Date:    row.VisitDate.Format("02.01.2006"),
			Patient: row.Patient,
			Doctor:  row.Doctor,
			Service: row.Service,
			Cost:    formatMoney(row.CostRub),
			Status:  row.Status,
		})
	}
	return out, nil
}

func (s *Service) Analytics(ctx context.Context, period string) (model.Analytics, error) {
	period = strings.TrimSpace(period)
	if period == "" {
		period = "За месяц"
	}
	from, to, err := periodRange(period, time.Now())
	if err != nil {
		return model.Analytics{}, err
	}
	prevFrom, prevTo := previousRange(period, from)

	dental, err := s.repo.SumDental(ctx, from, to)
	if err != nil {
		return model.Analytics{}, err
	}
	pharmacy, err := s.repo.SumPharmacy(ctx, from, to)
	if err != nil {
		return model.Analytics{}, err
	}
	prevDental, err := s.repo.SumDental(ctx, prevFrom, prevTo)
	if err != nil {
		return model.Analytics{}, err
	}
	prevPharmacy, err := s.repo.SumPharmacy(ctx, prevFrom, prevTo)
	if err != nil {
		return model.Analytics{}, err
	}
	loadRaw, err := s.repo.DoctorLoad(ctx, from, to)
	if err != nil {
		return model.Analytics{}, err
	}
	top, err := s.repo.TopServices(ctx, from, to)
	if err != nil {
		return model.Analytics{}, err
	}
	if top == nil {
		top = []model.ServiceStat{}
	}

	days := int(to.Sub(from).Hours() / 24)
	if days < 1 {
		days = 1
	}
	capacity := 8 * days
	load := make([]model.DoctorLoad, 0, len(loadRaw))
	for _, row := range loadRaw {
		percent := 0
		if capacity > 0 {
			percent = row.Appointments * 100 / capacity
		}
		if percent > 100 {
			percent = 100
		}
		load = append(load, model.DoctorLoad{
			Name:    row.Name,
			Room:    row.Room,
			Percent: percent,
		})
	}

	return model.Analytics{
		Period:          period,
		DentalRevenue:   formatMoney(dental),
		PharmacyRevenue: formatMoney(pharmacy),
		TotalRevenue:    formatMoney(dental + pharmacy),
		DentalDelta:     deltaText(dental, prevDental),
		PharmacyDelta:   deltaText(pharmacy, prevPharmacy),
		DoctorLoad:      load,
		TopServices:     top,
	}, nil
}

func (s *Service) Report(ctx context.Context) (model.Report, error) {
	patients, waiting, leads, err := s.repo.ReportCounts(ctx, today())
	if err != nil {
		return model.Report{}, err
	}
	return model.Report{
		Message: fmt.Sprintf(
			"Отчет администратора отправлен директору. Пациентов: %d, ожидают сегодня: %d, открытых заявок: %d.",
			patients, waiting, leads,
		),
		Patients:     patients,
		WaitingToday: waiting,
		OpenLeads:    leads,
	}, nil
}

func periodRange(period string, now time.Time) (time.Time, time.Time, error) {
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	switch period {
	case "За сегодня":
		return start, start.AddDate(0, 0, 1), nil
	case "За неделю":
		wd := int(now.Weekday())
		if wd == 0 {
			wd = 7
		}
		from := start.AddDate(0, 0, -(wd - 1))
		return from, from.AddDate(0, 0, 7), nil
	case "За месяц":
		from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		return from, from.AddDate(0, 1, 0), nil
	case "За год":
		from := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
		return from, from.AddDate(1, 0, 0), nil
	default:
		return time.Time{}, time.Time{}, invalid("период: За сегодня, За неделю, За месяц или За год")
	}
}

func previousRange(period string, from time.Time) (time.Time, time.Time) {
	switch period {
	case "За неделю":
		return from.AddDate(0, 0, -7), from
	case "За месяц":
		return from.AddDate(0, -1, 0), from
	case "За год":
		return from.AddDate(-1, 0, 0), from
	default:
		return from.AddDate(0, 0, -1), from
	}
}

func deltaText(current, prev int64) string {
	if prev == 0 && current == 0 {
		return "без изменений к прошлому периоду"
	}
	if prev == 0 {
		return "↑ нет данных за прошлый период"
	}
	pct := int(math.Round((float64(current-prev) / float64(prev)) * 100))
	switch {
	case pct > 0:
		return fmt.Sprintf("↑ +%d%% к прошлому периоду", pct)
	case pct < 0:
		return fmt.Sprintf("↓ %d%% к прошлому периоду", pct)
	default:
		return "без изменений к прошлому периоду"
	}
}
