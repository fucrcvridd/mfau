// Package repository — контракт слоя данных.
// Сервис зависит от этого интерфейса и не знает, что внутри Postgres.
package repository

import (
	"context"
	"errors"
	"time"

	"dental-crm/backend/internal/model"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrEmptyStock = errors.New("empty stock")
)

type Repository interface {
	ListPatients(ctx context.Context) ([]model.Patient, error)
	GetPatient(ctx context.Context, id int64) (model.Patient, error)
	CreatePatient(ctx context.Context, in model.PatientInput) (model.Patient, error)
	UpdatePatientCard(ctx context.Context, id int64, card model.PatientCard) (model.Patient, error)
	FindPatientByName(ctx context.Context, name string) (model.Patient, error)

	ListStaff(ctx context.Context) ([]model.Staff, error)
	ListRooms(ctx context.Context) ([]model.Room, error)
	ListServices(ctx context.Context) ([]model.ServiceItem, error)
	FindStaffByName(ctx context.Context, name string) (model.Staff, error)
	FindRoomByName(ctx context.Context, name string) (model.Room, error)
	FindServiceByName(ctx context.Context, name string) (model.ServiceItem, error)

	ListAppointments(ctx context.Context, day *time.Time, doctor string) ([]model.Appointment, error)
	GetAppointment(ctx context.Context, id int64) (model.Appointment, error)
	CreateAppointment(ctx context.Context, in model.AppointmentWrite) (model.Appointment, error)
	UpdateAppointment(ctx context.Context, id int64, roomID *int64, status *string) (model.Appointment, error)

	ListLeads(ctx context.Context) ([]model.Lead, error)
	GetLead(ctx context.Context, id int64) (model.Lead, error)
	CreateLead(ctx context.Context, in model.LeadInput, serviceID int64) (model.Lead, error)
	DeleteLead(ctx context.Context, id int64) error

	ListPharmacy(ctx context.Context, query string) ([]model.PharmacyItem, error)
	ConsumePharmacy(ctx context.Context, id int64) (model.PharmacyItem, error)

	ListArchive(ctx context.Context, year, month *int) ([]model.ArchiveRow, error)
	SumDental(ctx context.Context, from, to time.Time) (int64, error)
	SumPharmacy(ctx context.Context, from, to time.Time) (int64, error)
	DoctorLoad(ctx context.Context, from, to time.Time) ([]model.DoctorLoadRaw, error)
	TopServices(ctx context.Context, from, to time.Time) ([]model.ServiceStat, error)
	ReportCounts(ctx context.Context, day time.Time) (patients, waitingToday, openLeads int, err error)
}
