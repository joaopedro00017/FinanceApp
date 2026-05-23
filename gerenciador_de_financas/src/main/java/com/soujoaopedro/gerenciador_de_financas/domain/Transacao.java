package com.soujoaopedro.gerenciador_de_financas.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tb_transacao")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transacao {

    //Aqui nos geramos IDS Únicos que não saem duplicados por causa da função UUID
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Usamos o "nullable = false" para tornarmos a coluna obrigatória
    @Column(nullable = false)
    private String descricao;

    // Uso de BigDecimal já que estamos lidando com situações financeiras
    @Column(nullable = false)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate data;

    // Gera no BD os Enuns ao invés de 0 e 1
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoTransacao tipo;
}
