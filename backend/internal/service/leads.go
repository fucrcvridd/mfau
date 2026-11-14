package service

import (
	"context"
	"errors"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/repository"
)

func (s *Service) ListLeads(ctx context.Context) ([]model.Lead, error) {
	items, err := s.repo.ListLeads(ctx)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []model.Lead{}
	}
	return items, nil
}

func (s *Service) DeleteLead(ctx context.Context, id int64) error {
	if id <= 0 {
		return invalid("некорректная заявка")
	}
	err := s.repo.DeleteLead(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return invalid("заявка не найдена")
	}
	return err
}

func (s *Service) AcceptLead(ctx context.Context, id int64) (model.Appointment, error) {
	if id <= 0 {
		return model.Appointment{}, invalid("некорректная заявка")
	}
	lead, err := s.repo.GetLead(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return model.Appointment{}, invalid("заявка не найдена")
		}
		return model.Appointment{}, err
	}
	appointment, err := s.CreateAppointment(ctx, model.CreateAppointmentInput{
		Patient: lead.Patient,
		Phone:   lead.Phone,
		Doctor:  "Дмитрий Зубов",
		Time:    "15:00",
		Room:    "Кабинет №1",
		Service: lead.Service,
	})
	if err != nil {
		return model.Appointment{}, err
	}
	if err := s.repo.DeleteLead(ctx, id); err != nil {
		return model.Appointment{}, err
	}
	return appointment, nil
}
