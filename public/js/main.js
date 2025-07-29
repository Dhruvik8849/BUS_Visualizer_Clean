// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Handle flash messages
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(function(flash) {
        setTimeout(function() {
            flash.style.opacity = '0';
            setTimeout(function() {
                flash.remove();
            }, 500);
        }, 5000);
    });

    // Handle seat selection
    const seats = document.querySelectorAll('.seat-available');
    const selectedSeats = [];
    
    seats.forEach(function(seat) {
        seat.addEventListener('click', function() {
            const seatNumber = this.getAttribute('data-seat-number');
            
            if (this.classList.contains('seat-selected')) {
                // Deselect seat
                this.classList.remove('seat-selected');
                const index = selectedSeats.indexOf(seatNumber);
                if (index > -1) {
                    selectedSeats.splice(index, 1);
                }
            } else {
                // Select seat
                this.classList.add('seat-selected');
                selectedSeats.push(seatNumber);
            }
            
            // Update hidden input value for form submission
            const seatsInput = document.getElementById('selected-seats');
            if (seatsInput) {
                seatsInput.value = JSON.stringify(selectedSeats);
            }
            
            // Update selected seats count
            const selectedSeatsCount = document.getElementById('selected-seats-count');
            if (selectedSeatsCount) {
                selectedSeatsCount.textContent = selectedSeats.length;
            }
            
            // Update total amount
            updateTotalAmount();
            
            // Enable/disable submit button based on seat selection
            const submitButton = document.getElementById('submitBooking');
            if (submitButton) {
                submitButton.disabled = selectedSeats.length === 0;
            }
        });
    });
    
    // Function to update total amount
    function updateTotalAmount() {
        const basePrice = parseFloat(document.getElementById('base-price')?.value || 0);
        const totalAmount = basePrice * selectedSeats.length;
        
        const totalAmountElement = document.getElementById('total-amount');
        if (totalAmountElement) {
            totalAmountElement.textContent = totalAmount.toFixed(2);
        }
    }
    
    // Handle form validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Date input restrictions (prevent selecting past dates)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        const today = new Date().toISOString().split('T')[0];
        input.setAttribute('min', today);
    });
}); 