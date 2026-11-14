package service

import (
	"context"
	"errors"
	"strings"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

func (s *Service) ListAppointments(ctx context.Context, date, doctor string) ([]model.Appointment, error) {
	day := today()
	if strings.TrimSpace(date) != "" {
		parsed, err := parseDay(date)
		if err != nil {
			return nil, err
		}
		day = parsed
	}
	items, err := s.repo.ListAppointments(ctx, &day, strings.TrimSpace(doctor))
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.Appointment{}
	}
	return items, nil
}

func (s *Service) CreateAppointment(ctx context.Context, in model.CreateAppointmentInput) (model.Appointment, error) {
	in.Patient = strings.TrimSpace(in.Patient)
	in.Phone = strings.TrimSpace(in.Phone)
	in.Doctor = strings.TrimSpace(in.Doctor)
	in.Room = strings.TrimSpace(in.Room)
	in.Service = strings.TrimSpace(in.Service)
	in.Time = strings.TrimSpace(in.Time)
	if in.Patient == "" || in.Doctor == "" || in.Room == "" || in.Service == "" {
		return model.Appointment{}, invalid("укажите пациента, врача, кабинет и услугу")
	}
	if err := validateTime(in.Time); err != nil {
		return model.Appointment{}, err
	}

	patient, err := s.repo.FindPatientByName(ctx, in.Patient)
	if errors.Is(err, repository.ErrNotFound) {
		phone := in.Phone
		if phone == "" {
			phone = "+7 (999) 000-00-00"
		}
		patient, err = s.repo.CreatePatient(ctx, model.PatientInput{
			Name:      in.Patient,
			Phone:     phone,
			Birth:     "1995-01-01",
			Diagnosis: "Первичный осмотр / Обращение",
			Notes:     "Записан на услугу: " + in.Service,
		})
	}
	if err != nil {
		return model.Appointment{}, err
	}

	staff, err := s.repo.FindStaffByName(ctx, in.Doctor)
	if err != nil {
		return model.Appointment{}, notFound(err, "врач не найден")
	}
	room, err := s.repo.FindRoomByName(ctx, in.Room)
	if err != nil {
		return model.Appointment{}, notFound(err, "кабинет не найден")
	}
	item, err := s.repo.FindServiceByName(ctx, in.Service)
	if err != nil {
		return model.Appointment{}, notFound(err, "услуга не найдена")
	}

	return s.repo.CreateAppointment(ctx, model.AppointmentWrite{
		PatientID: patient.ID,
		StaffID:   staff.ID,
		RoomID:    room.ID,
		ServiceID: item.ID,
		VisitDate: today(),
		VisitTime: in.Time,
		Status:    "Ожидает",
		CostRub:   item.PriceRub,
	})
}

func (s *Service) UpdateAppointment(ctx context.Context, id int64, in model.UpdateAppointmentInput) (model.Appointment, error) {
	if id <= 0 {
		return model.Appointment{}, invalid("некорректная запись")
	}
	if in.Room == nil && in.Status == nil {
		return model.Appointment{}, invalid("нечего обновлять")
	}

	var roomID *int64
	if in.Room != nil {
		name := strings.TrimSpace(*in.Room)
		if name == "" {
			return model.Appointment{}, invalid("пустой кабинет")
		}
		room, err := s.repo.FindRoomByName(ctx, name)
		if err != nil {
			return model.Appointment{}, notFound(err, "кабинет не найден")
		}
		roomID = &room.ID
	}
	if in.Status != nil {
		status := strings.TrimSpace(*in.Status)
		if err := validateStatus(status); err != nil {
			return model.Appointment{}, err
		}
		in.Status = &status
	}

	item, err := s.repo.UpdateAppointment(ctx, id, roomID, in.Status)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return model.Appointment{}, invalid("запись не найдена")
		}
		return model.Appointment{}, err
	}
	return item, nil
}
