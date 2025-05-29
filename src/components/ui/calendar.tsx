const handleBulkAvailabilityUpdate = async (status: 'available' | 'blocked') => {
    if (!selectedRoom) return;
    const range = selectedDateRanges.get(selectedRoom);
    if (!range?.start || !range?.end) return;

    const daysToUpdate = eachDayOfInterval({
      start: range.start,
      end: range.end
    }).map(date => ({
      room_id: selectedRoom,
      date: format(date, 'yyyy-MM-dd'),
      available: status === 'available',
      blocked_reason: status === 'blocked' ? 'manual_block' : null
    }));

    try {
      await updateBulkAvailability(daysToUpdate);
      toast.success('Disponibilità aggiornata con successo');
      // Clear the selection after successful update
      setSelectedDateRanges(new Map(selectedDateRanges.set(selectedRoom, { start: null, end: null })));
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento della disponibilità');
    }
  };