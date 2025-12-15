using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReadingService.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAutoInvoicedStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update any existing AutoInvoiced (value 2) to Confirmed (value 1)
            migrationBuilder.Sql("UPDATE MonthlyReadings SET Status = 1 WHERE Status = 2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No need to revert since we're removing the status
        }
    }
}
