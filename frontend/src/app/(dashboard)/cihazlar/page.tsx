"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { DeviceForm } from "@/components/forms/DeviceForm";
import { deviceService } from "@/services/deviceService";
import { customerService } from "@/services/customerService";
import { Device } from "@/types/device";
import { Customer } from "@/types/customer";
import { ApiError } from "@/types/api";

export default function CihazlarPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deviceData, customerData] = await Promise.all([
        deviceService.getAll(),
        customerService.getAll(),
      ]);
      setDevices(deviceData);
      setCustomers(customerData);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Cihazlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: Parameters<typeof deviceService.create>[0]) => {
    await deviceService.create(data);
    setModalOpen(false);
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cihazlar"
        description="Cihaz kayıtlarını yönetin"
        action={
          <Button onClick={() => setModalOpen(true)} disabled={customers.length === 0}>
            Yeni Cihaz
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Cihaz Listesi</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner className="mx-auto" />
            </div>
          ) : error ? (
            <div className="px-6 pb-6">
              <ErrorMessage message={error} />
            </div>
          ) : devices.length === 0 ? (
            <EmptyState message="Henüz cihaz kaydı bulunmuyor" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seri No</TableHead>
                  <TableHead>Marka / Model</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Satın Alma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.serialNumber}</TableCell>
                    <TableCell>
                      {device.model?.brand?.name ?? "-"} / {device.model?.name ?? "-"}
                    </TableCell>
                    <TableCell>{device.customer?.fullName || "-"}</TableCell>
                    <TableCell>{device.purchaseDate || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Cihaz" size="lg">
        {customers.length === 0 ? (
          <p className="text-sm text-gray-500">Önce müşteri kaydı oluşturun</p>
        ) : (
          <DeviceForm
            customers={customers}
            onSubmit={handleCreate}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
