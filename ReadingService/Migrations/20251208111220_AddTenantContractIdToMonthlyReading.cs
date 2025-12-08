using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReadingService.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantContractIdToMonthlyReading : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantContractId",
                table: "MonthlyReadings",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantContractId",
                table: "MonthlyReadings");
        }
    }
}
